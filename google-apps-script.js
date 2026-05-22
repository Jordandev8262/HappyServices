function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Évite les conflits si plusieurs personnes envoient en même temps

  try {
    // Utilisation de l'ID direct du Sheet (plus robuste que l'URL)
    var id = "1xKd_6ofZ5N2YtiwghLAgJQSO35cidHa80LFsQBjWhzw";
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheets()[0];
    
    // Récupération des données
    var name = e.parameter.name || "Non spécifié";
    var email = e.parameter.email || "Non spécifié";
    var event_type = e.parameter.event_type || "Non spécifié";
    var event_date = e.parameter.event_date || "Non spécifié";
    var subject = e.parameter.subject || "Sans objet";
    var message = e.parameter.message || "Pas de message";
    
    // Ajout de la ligne
    sheet.appendRow([
      new Date(), 
      name, 
      email, 
      event_type, 
      event_date, 
      subject, 
      message
    ]);
    
    // Envoi de l'alerte
    try {
      MailApp.sendEmail({
        to: "happyservices@gmail.com",
        subject: "Nouveau contact : " + subject,
        body: "Vous avez reçu une nouvelle demande.\n\nNom: " + name + "\nEmail: " + email + "\nType: " + event_type + "\nDate: " + event_date + "\nObjet: " + subject + "\nMessage: " + message
      });
    } catch (e) {
      // Si l'email échoue, on continue quand même pour ne pas bloquer le Sheet
    }
    
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput("Erreur : " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
