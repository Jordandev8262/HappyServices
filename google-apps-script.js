function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var id = "1xKd_6ofZ5N2YtiwghLAgJQSO35cidHa80LFsQBjWhzw";
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheets()[0];
    
    var action = e.parameter.action || "append";

    if (action === "clear") {
      // Garder l'en-tête (ligne 1) et supprimer le reste
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return ContentService.createTextOutput("CLEARED").setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === "updateStatus") {
      var rowIndex = parseInt(e.parameter.rowIndex);
      var newStatus = e.parameter.status;
      if (rowIndex > 1 && newStatus) {
        sheet.getRange(rowIndex, 8).setValue(newStatus); // Colonne 8 = Statut
        return ContentService.createTextOutput("UPDATED").setMimeType(ContentService.MimeType.TEXT);
      }
      return ContentService.createTextOutput("INVALID_PARAMS").setMimeType(ContentService.MimeType.TEXT);
    }

    // Récupération des données pour l'ajout (par défaut)
    var name = e.parameter.name || "Non spécifié";
    var email = e.parameter.email || "Non spécifié";
    var event_type = e.parameter.event_type || "Non spécifié";
    var event_date = e.parameter.event_date || "Non spécifié";
    var subject = e.parameter.subject || "Sans objet";
    var message = e.parameter.message || "Pas de message";
    var status = "Nouveau"; // Statut par défaut pour les nouveaux contacts
    
    // Ajout de la ligne (8 colonnes maintenant)
    sheet.appendRow([
      new Date(), 
      name, 
      email, 
      event_type, 
      event_date, 
      subject, 
      message,
      status
    ]);
    
    // Envoi de l'alerte
    try {
      MailApp.sendEmail({
        to: "happyservices@gmail.com",
        subject: "Nouveau contact : " + subject,
        body: "Vous avez reçu une nouvelle demande.\n\nNom: " + name + "\nEmail: " + email + "\nType: " + event_type + "\nDate: " + event_date + "\nObjet: " + subject + "\nMessage: " + message
      });
    } catch (e) {}
    
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput("Erreur : " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  try {
    var id = "1xKd_6ofZ5N2YtiwghLAgJQSO35cidHa80LFsQBjWhzw";
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    var results = [];
    // On commence à i=1 pour sauter l'en-tête
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0]) continue; // Sauter les lignes vides
      results.push({
        id: "gs_" + i + "_" + new Date(data[i][0]).getTime(),
        rowIndex: i + 1, // Pour pouvoir mettre à jour le statut plus tard
        createdAt: data[i][0],
        name: data[i][1],
        email: data[i][2],
        event_type: data[i][3],
        event_date: data[i][4],
        subject: data[i][5],
        message: data[i][6],
        status: data[i][7] || "Nouveau" // Colonne 8
      });
    }
    
    results.reverse();
    
    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
