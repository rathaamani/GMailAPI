const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const oauth2Client = new OAuth2Client({
clientId: '547957210124-8oknn1ie2qb4p2rumkhrue68rgcj9u7r.apps.googleusercontent.com',
clientSecret: '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',
});

// Set the refresh token
oauth2Client.setCredentials({
refresh_token: '1//04H_EJEO-WeciCgYIARAAGAQSNwF-L9Ir6jkkIJyIHcGjrZfEned8RipZK1AaaicYk28evDU7pVJjeidPfT4AHNOumL9ZCaXxhjo',
});

async function login() {
const { token } = await oauth2Client.getAccessToken();
const gmail = google.gmail({
version: 'v1',
auth: oauth2Client,
});
return gmail;
}

async function replyToEmails() {
const gmail = await login();
const repliedEmails = new Set(); // Track replied email IDs
const labelName = 'AutoReplied'; // Name of the label

while (true) {
try {
const res = await gmail.users.messages.list({
userId: 'me',
labelIds: ['UNREAD'],
});

const messages = res.data.messages;
if (messages && messages.length) {
for (const message of messages) {
try {
const messageDetails = await gmail.users.messages.get({
userId: 'me',
id: message.id,
format: 'metadata',
});

const headers = messageDetails.data.payload.headers;
const recipientData = headers.find((header) => header.name === 'From').value;
const emailRegex = /<([^>]+)>/;
const match = recipientData.match(emailRegex);
const emailaddress = match && match.length > 1 ? match[1] : '';
const replyToHeader = headers.find((header) => header.name === 'Reply-to');
const replyToAddress = replyToHeader ? replyToHeader.value : '';

const isNoReply = emailaddress.includes('noreply') || emailaddress.includes('no-reply') || replyToAddress.includes('to-reply');
if (isNoReply) {
console.log('Skipping reply to a "noreply" and "no-reply" email');
continue; // Skip to the next message
}

const isAdvertisement = headers.some((header) => header.name === 'X-Gmail-Labels' && header.value.includes('CATEGORY_PROMOTIONS'));
const isSubscription = headers.some((header) => header.name === 'X-Gmail-Labels' && header.value.includes('CATEGORY_UPDATES'));
if (isAdvertisement || isSubscription) {
console.log('Skipping reply to an advertisement or subscription email');
continue; // Skip to the next message
}

if (!repliedEmails.has(message.id)) {
const subject = headers.find((header) => header.name === 'Subject').value;
// Extract the sender's name from the email address
const senderName = recipientData.match(/([^<]+)</)?.[1]?.trim();  
const threadId = messageDetails.data.threadId;
const reply = `Hi ${senderName ? senderName : ''},

I'm out of the office. I'll be checking my email periodically, but I may not be able to respond immediately.

If you need immediate assistance, please contact 9876432190 at rathaamani2001@gmail.

Thank you for your understanding.
Thanks,
Rathaamani `;

const rawMessage = `To: ${emailaddress}\r\nSubject: ${subject}\r\nIn-Reply-To: ${message.id}\r\nReferences: ${message.id}\r\n\r\n${reply}`;

await gmail.users.messages.send({
userId: 'me',
requestBody: {
raw: Buffer.from(rawMessage).toString('base64'),
threadId: threadId,
},
});

console.log('Reply mail sent successfully');

// Add the email ID to the repliedEmails set
repliedEmails.add(message.id);

// Create or retrieve the label
const labelsRes = await gmail.users.labels.list({
userId: 'me',
});

const existingLabel = labelsRes.data.labels.find((label) => label.name === labelName);

let labelId;
if (existingLabel) {
labelId = existingLabel.id;
} else {
const createLabelRes = await gmail.users.labels.create({
userId: 'me',
requestBody: {
name: labelName,
},
});
labelId = createLabelRes.data.id;
}

// Add the label to the email
await gmail.users.messages.modify({
userId: 'me',
id: message.id,
requestBody: {
addLabelIds: [labelId],
},
});
}
} catch (error) {
console.error('Error while processing email details:', error);
}
}
}

await sleep(45, 120);
} catch (error) {
console.error('Error whilefetching emails:', error);
}
}
}

async function sleep(minSeconds, maxSeconds) {
const interval = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
return new Promise((resolve) => setTimeout(resolve, interval * 1000));
}

replyToEmails();
