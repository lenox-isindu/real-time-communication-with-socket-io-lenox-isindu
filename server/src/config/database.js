import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'dns'; 
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('Attempting to connect to MongoDB...');
      
      this.client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000, // 30 seconds timeout
        socketTimeoutMS: 45000, // 45 seconds socket timeout
        maxPoolSize: 10,
        minPoolSize: 1,
      });
      
      await this.client.connect();
      this.db = this.client.db();
      this.isConnected = true;
      
      console.log('✅ Connected to MongoDB:', this.db.databaseName);
      
      await this.initializeCollections();
      
      return this.db;
    } catch (error) {
      console.error(' MongoDB connection error:', error);
      
      // More specific error handling
      if (error.name === 'MongoServerSelectionError') {
        console.error('🔧 Tips:');
        console.error('1. Check your MongoDB Atlas IP whitelist');
        console.error('2. Verify your internet connection');
        console.error('3. Check if MongoDB Atlas cluster is running');
      }
      
      throw error;
    }
  }

  async initializeCollections() {
    try {
      // Create messages collection if it doesn't exist
      const collections = await this.db.listCollections().toArray();
      const messagesCollectionExists = collections.some(c => c.name === 'messages');
      
      if (!messagesCollectionExists) {
        await this.db.createCollection('messages');
        console.log('✅ Created messages collection');
      }

      // Create indexes
      await this.db.collection('messages').createIndex({ timestamp: -1 });
      await this.db.collection('messages').createIndex({ room: 1 });
      await this.db.collection('messages').createIndex({ userId: 1 });
      
      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('Error initializing collections:', error);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  getDB() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

// Create single instance
const database = new Database();
export default database;