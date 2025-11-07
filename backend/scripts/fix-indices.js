const mongoose = require('mongoose');
const User = require('../models/user');

const removeDuplicateIndices = async () => {
  try {
    // Get all indexes on the users collection
    const indexes = await User.collection.getIndexes();
    console.log('Current indexes:', indexes);

    // Find email indexes
    const emailIndexes = Object.entries(indexes)
      .filter(([_, def]) => JSON.stringify(def).includes('"email":1'));

    // If multiple email indexes exist, drop all but one
    if (emailIndexes.length > 1) {
      console.log('Found multiple email indexes:', emailIndexes);
      // Keep the first one and drop the rest
      for (let i = 1; i < emailIndexes.length; i++) {
        const [indexName] = emailIndexes[i];
        console.log('Dropping index:', indexName);
        await User.collection.dropIndex(indexName);
      }
      console.log('Successfully removed duplicate indexes');
    } else {
      console.log('No duplicate indexes found');
    }
  } catch (error) {
    console.error('Error removing duplicate indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Connect to database and remove duplicates
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => removeDuplicateIndices())
  .catch(error => {
    console.error('Connection error:', error);
    process.exit(1);
  });