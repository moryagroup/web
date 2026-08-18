/**
 * ==============================================================================
 * Google Apps Script for Morya Group Web App
 * Target Account: moryagroupdata@gmail.com
 * ==============================================================================
 * 
 * FEATURES:
 * 1. Automatically receives approved transaction receipt images (with payment proof and signatures).
 * 2. Daily 11:59 PM Batch Dispatch: Receives and saves all day's approved receipt copies into Drive and sends unified email.
 * 3. Saves images into organized Google Drive folders: "Morya Group Receipts / [Financial Year] / [Date]".
 * 4. Sends formatted HTML email with all receipt images attached directly to moryagroupdata@gmail.com.
 * 5. Provides a health-check/ping endpoint to test connection directly from Settings.
 *
 * HOW TO DEPLOY:
 * 1. Go to https://script.google.com while logged into moryagroupdata@gmail.com
 * 2. Create a "New Project" (Name it: "Morya Group Transaction & Drive Sync")
 * 3. Replace all existing code in Code.gs with this file's code.
 * 4. Click "Deploy" -> "New deployment".
 * 5. Select type: "Web app".
 * 6. Set Description: "v2 - Daily 11:59 PM Batch & Single Receipts".
 * 7. Execute as: "Me (moryagroupdata@gmail.com)".
 * 8. Who has access: "Anyone" (allows app to upload directly).
 * 9. Click "Deploy", authorize permissions, and copy the "Web app URL".
 * 10. Paste the Web app URL in Morya Group App -> Settings -> Google Drive / Email Web App URL.
 * ==============================================================================
 */

const TARGET_EMAIL = 'moryagroupdata@gmail.com';
const ROOT_FOLDER_NAME = 'Morya Group Official Receipts';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'No payload received' }, 400);
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'SAVE_AND_EMAIL';

    // 1. Ping / Test Action
    if (action === 'PING') {
      return responseJSON({
        status: 'success',
        message: 'Google Apps Script connection active & ready for moryagroupdata@gmail.com',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Batch Receipts Dispatch (Daily 11:59 PM Auto-Send)
    if (action === 'BATCH_RECEIPTS_DISPATCH' || action === 'DAILY_BATCH_RECEIPTS') {
      var receipts = data.receipts || [];
      var financialYear = data.financialYear || '2026-2027';
      var dateStr = data.dateStr || Utilities.formatDate(new Date(), 'GMT+5:30', 'yyyy-MM-dd');
      var subject = data.subject || ('[मोरया ग्रुप] दैनिक सर्व मंजूर पावत्या संग्रह (' + dateStr + ')');
      var htmlBody = data.htmlBody || '<p>दैनिक सर्व मंजूर व्यवहार पावत्या खालीलप्रमाणे संलग्न आहेत.</p>';

      var targetFolder = getOrCreateFolder(financialYear, dateStr);
      var emailAttachments = [];
      var driveLinks = [];

      for (var i = 0; i < receipts.length; i++) {
        var item = receipts[i];
        if (item.base64) {
          var decodedBytes = Utilities.base64Decode(item.base64);
          var blob = Utilities.newBlob(decodedBytes, item.contentType || 'image/jpeg', item.fileName || ('receipt_' + (i + 1) + '.jpg'));
          var driveFile = targetFolder.createFile(blob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          emailAttachments.push(blob);
          driveLinks.push({ title: item.fileName, url: driveFile.getUrl(), type: 'RECEIPT' });
        }

        if (item.proofBase64) {
          var proofBytes = Utilities.base64Decode(item.proofBase64);
          var proofBlob = Utilities.newBlob(proofBytes, item.proofContentType || 'image/jpeg', item.proofFileName || ('proof_' + (i + 1) + '.jpg'));
          var proofFile = targetFolder.createFile(proofBlob);
          proofFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          emailAttachments.push(proofBlob);
          driveLinks.push({ title: item.proofFileName, url: proofFile.getUrl(), type: 'PROOF' });
        }
      }

      var driveLinksHtml = '<br><hr style="border:0;border-top:1px solid #fed7aa;margin:16px 0;">' +
        '<div style="background:#fff7ed;padding:12px;border-radius:8px;border:1px solid #fdbba74;text-align:center;">' +
        '<strong style="color:#7c2d12;display:block;margin-bottom:8px;">📁 Google Drive फोल्डर लिंक:</strong>' +
        '<a href="' + targetFolder.getUrl() + '" target="_blank" style="display:inline-block;padding:10px 20px;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Google Drive वर आजच्या सर्व पावत्या पहा</a>' +
        '</div>';

      var emailOptions = {
        name: 'मोरया ग्रुप प्रणाली (Morya Group System)',
        htmlBody: htmlBody + driveLinksHtml,
        attachments: emailAttachments
      };

      GmailApp.sendEmail(TARGET_EMAIL, subject, '', emailOptions);

      return responseJSON({
        status: 'success',
        message: 'Daily batch (' + receipts.length + ' receipts) saved to Google Drive and emailed to ' + TARGET_EMAIL,
        folderUrl: targetFolder.getUrl(),
        count: receipts.length
      });
    }

    // 3. Single Receipt Dispatch
    var base64Data = data.base64;
    var fileName = data.fileName || ('receipt_' + Date.now() + '.jpg');
    var contentType = data.contentType || 'image/jpeg';

    var proofBase64 = data.proofBase64;
    var proofFileName = data.proofFileName || ('proof_' + Date.now() + '.jpg');
    var proofContentType = data.proofContentType || 'image/jpeg';

    var subject = data.subject || '[मोरया ग्रुप] अधिकृत व्यवहार पावती नोंदणी';
    var htmlBody = data.htmlBody || '<p>नवीन अधिकृत व्यवहार पावती संलग्न केली आहे.</p>';
    var financialYear = data.financialYear || '2026-2027';

    var targetFolder = getOrCreateFolder(financialYear);

    var receiptBlob = null;
    var receiptDriveUrl = '';

    if (base64Data) {
      var decodedReceiptBytes = Utilities.base64Decode(base64Data);
      receiptBlob = Utilities.newBlob(decodedReceiptBytes, contentType, fileName);
      var driveReceiptFile = targetFolder.createFile(receiptBlob);
      driveReceiptFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      receiptDriveUrl = driveReceiptFile.getUrl();
    }

    var proofBlob = null;
    var proofDriveUrl = '';

    if (proofBase64) {
      var decodedProofBytes = Utilities.base64Decode(proofBase64);
      proofBlob = Utilities.newBlob(decodedProofBytes, proofContentType, proofFileName);
      var driveProofFile = targetFolder.createFile(proofBlob);
      driveProofFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      proofDriveUrl = driveProofFile.getUrl();
    }

    // Build Email options with attachments & direct Drive links
    var emailAttachments = [];
    if (receiptBlob) emailAttachments.push(receiptBlob);
    if (proofBlob) emailAttachments.push(proofBlob);

    var driveLinksHtml = '<br><hr style="border:0;border-top:1px solid #fed7aa;margin:16px 0;">' +
      '<div style="text-align:center;margin:12px 0;">';

    if (receiptDriveUrl) {
      driveLinksHtml += '<a href="' + receiptDriveUrl + '" target="_blank" style="display:inline-block;margin:4px 8px;padding:10px 18px;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">📁 Google Drive वर पावती पहा</a>';
    }

    if (proofDriveUrl) {
      driveLinksHtml += '<a href="' + proofDriveUrl + '" target="_blank" style="display:inline-block;margin:4px 8px;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">📷 Google Drive वर मूळ पेमेंट पुरावा पहा</a>';
    }

    driveLinksHtml += '</div>';

    var emailOptions = {
      name: 'मोरया ग्रुप प्रणाली (Morya Group System)',
      htmlBody: htmlBody + driveLinksHtml,
      attachments: emailAttachments
    };

    GmailApp.sendEmail(TARGET_EMAIL, subject, '', emailOptions);

    return responseJSON({
      status: 'success',
      message: 'Transaction voucher & proof saved to Google Drive and emailed to ' + TARGET_EMAIL,
      viewUrl: receiptDriveUrl,
      receiptUrl: receiptDriveUrl,
      proofUrl: proofDriveUrl,
      fileName: fileName,
      proofFileName: proofFileName
    });

  } catch (err) {
    return responseJSON({
      status: 'error',
      message: err.toString()
    }, 500);
  }
}

function doGet(e) {
  return responseJSON({
    status: 'success',
    message: 'Morya Group Apps Script is running online for ' + TARGET_EMAIL,
    targetEmail: TARGET_EMAIL
  });
}

function getOrCreateFolder(yearSubfolderName, dateSubfolderName) {
  var rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);

  if (!yearSubfolderName) return rootFolder;

  var subFolders = rootFolder.getFoldersByName(yearSubfolderName);
  var yearFolder = subFolders.hasNext() ? subFolders.next() : rootFolder.createFolder(yearSubfolderName);

  if (!dateSubfolderName) return yearFolder;

  var dateFolders = yearFolder.getFoldersByName(dateSubfolderName);
  return dateFolders.hasNext() ? dateFolders.next() : yearFolder.createFolder(dateSubfolderName);
}

function responseJSON(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
