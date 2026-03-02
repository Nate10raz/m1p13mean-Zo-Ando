import SibApiV3Sdk from 'sib-api-v3-sdk';

const defaultClient = SibApiV3Sdk.ApiClient.instance;
console.log(process.env.BREVO_API_KEY);
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendEmail = async (to, subject, html) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: process.env.EMAIL_FROM_NAME || 'Mon App',
      email: process.env.EMAIL_FROM_ADDRESS,
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, data: result };

  } catch (err) {
    console.error('Error sending email:', err);
    return { success: false, error: err.message };
  }
};


// **Dans Render → Environment :**
// ```
// BREVO_API_KEY=xkeysib-xxxxxxxxxxxx
// EMAIL_FROM_NAME=Mon Projet
// EMAIL_FROM_ADDRESS=nate.razafi16@gmail.com