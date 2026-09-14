const mongoose = require('mongoose');
const dns = require('dns');

// Force IPv4 first on Windows to resolve SRV DNS issues
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore DNS config error if restricted
}

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  
  // Standard non-SRV direct seedlist fallback URL for cluster0.oqc1qpy.mongodb.net
  const fallbackUri = "mongodb://sineth:Sineth%40123@cluster0-shard-00-00.oqc1qpy.mongodb.net:27017,cluster0-shard-00-01.oqc1qpy.mongodb.net:27017,cluster0-shard-00-02.oqc1qpy.mongodb.net:27017/test?ssl=true&replicaSet=atlas-shard-0&authSource=admin&retryWrites=true&w=majority";

  console.log('[Connecting to MongoDB Atlas...]');

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 6000,
      family: 4
    });
    console.log(`\n======================================================`);
    console.log(`[SUCCESS] MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`======================================================\n`);
    return true;
  } catch (primaryError) {
    console.warn(`[SRV Connection Warning]: ${primaryError.message}`);
    console.log('[Attempting Direct Cluster Fallback Connection...]');

    try {
      const fallbackConn = await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 6000,
        family: 4
      });
      console.log(`\n======================================================`);
      console.log(`[SUCCESS] MongoDB Atlas Direct Cluster Connected: ${fallbackConn.connection.host}`);
      console.log(`======================================================\n`);
      return true;
    } catch (fallbackError) {
      console.error(`\n======================================================`);
      console.error(`[MongoDB Connection Error]: ${fallbackError.message}`);
      console.error(`📌 Please verify your internet connection or MongoDB Atlas access.`);
      console.error(`======================================================\n`);
      return false;
    }
  }
};

module.exports = connectDB;
