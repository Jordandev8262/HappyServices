/**
* PHP Email Form Validation - v3.10
* URL: https://bootstrapmade.com/php-email-form/
* Author: BootstrapMade.com
*/
(function () {
  "use strict";

  let forms = document.querySelectorAll('.php-email-form');

  forms.forEach( function(e) {
    e.addEventListener('submit', function(event) {
      event.preventDefault();

      let thisForm = this;

      let action = thisForm.getAttribute('action');
      let recaptcha = thisForm.getAttribute('data-recaptcha-site-key');
      
      if( ! action ) {
        displayError(thisForm, 'The form action property is not set!');
        return;
      }
      thisForm.querySelector('.loading').classList.add('d-block');
      thisForm.querySelector('.error-message').classList.remove('d-block');
      thisForm.querySelector('.sent-message').classList.remove('d-block');

      let formData = new FormData( thisForm );

      if ( recaptcha ) {
        if(typeof grecaptcha !== "undefined" ) {
          grecaptcha.ready(function() {
            try {
              grecaptcha.execute(recaptcha, {action: 'php_email_form_submit'})
              .then(token => {
                formData.set('recaptcha-response', token);
                php_email_form_submit(thisForm, action, formData);
              })
            } catch(error) {
              displayError(thisForm, error);
            }
          });
        } else {
          displayError(thisForm, 'The reCaptcha javascript API url is not loaded!')
        }
      } else {
        php_email_form_submit(thisForm, action, formData);
      }
    });
  });

  function php_email_form_submit(thisForm, action, formData) {
    if (action.includes('script.google.com')) {
      // Pour Google Script, on utilise une méthode plus robuste pour éviter les problèmes de Fetch/CORS
      const xhttp = new XMLHttpRequest();
      xhttp.open("POST", action, true);
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
          thisForm.querySelector('.loading').classList.remove('d-block');
          // Avec no-cors/GAS on ne peut pas lire le statut exact, on considère que c'est OK si on a envoyé
          let sentMessage = thisForm.querySelector('.sent-message');
          sentMessage.classList.add('d-block');
          thisForm.reset();

          // Faire disparaître le message après 5 secondes
          setTimeout(() => {
            sentMessage.classList.remove('d-block');
          }, 5000);
        }
      };
      xhttp.send(new URLSearchParams(formData));
      return;
    }

    fetch(action, {
      method: 'POST',
      body: formData,
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(response => {
      if( response.ok ) {
        return response.text();
      } else {
        throw new Error(`${response.status} ${response.statusText} ${response.url}`); 
      }
    })
    .then(data => {
      thisForm.querySelector('.loading').classList.remove('d-block');
      if (data.trim() == 'OK') {
        let sentMessage = thisForm.querySelector('.sent-message');
        sentMessage.classList.add('d-block');
        thisForm.reset(); 

        // Faire disparaître le message après 5 secondes
        setTimeout(() => {
          sentMessage.classList.remove('d-block');
        }, 5000);
      } else {
        throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action); 
      }
    })
    .catch((error) => {
      displayError(thisForm, error);
    });
  }

  function displayError(thisForm, error) {
    thisForm.querySelector('.loading').classList.remove('d-block');
    thisForm.querySelector('.error-message').innerHTML = error;
    thisForm.querySelector('.error-message').classList.add('d-block');
  }

})();
