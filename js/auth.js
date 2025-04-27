const client = new Appwrite.Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('680d3f8f00318a5de7b9');

const databases = new Appwrite.Databases(client);
const storage = new Appwrite.Storage(client);
const auth = new Appwrite.Account(client);

export { client, databases, storage, auth };