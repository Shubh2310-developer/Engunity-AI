#!/usr/bin/env node
/**
 * MongoDB Atlas Connection Test
 * 
 * Run this script to test your MongoDB Atlas connection:
 * node src/lib/test-mongodb.js
 */

const { connectToMongoDB, ChatService, checkMongoDBHealth } = require('./database/mongodb.ts');

async function testMongoDBConnection() {
  console.log('🧪 Testing MongoDB Atlas Connection...\n');

  try {
    // Test 1: Basic Connection
    console.log('1️⃣ Testing basic connection...');
    await connectToMongoDB();
    console.log('✅ Successfully connected to MongoDB Atlas\n');

    // Test 2: Health Check
    console.log('2️⃣ Checking database health...');
    const health = await checkMongoDBHealth();
    console.log('📊 Database Health:', JSON.stringify(health, null, 2));
    console.log('✅ Health check passed\n');

    // Test 3: Create Test Session
    console.log('3️⃣ Testing chat session creation...');
    const testSession = await ChatService.getOrCreateSession(
      'test_doc_123',
      'test_user_456',
      {
        name: 'Test Document.pdf',
        type: 'pdf',
        category: 'test'
      }
    );
    console.log('📝 Test session created:', testSession.sessionId);
    console.log('✅ Session creation test passed\n');

    // Test 4: Save Test Messages
    console.log('4️⃣ Testing message saving...');
    
    const userMessage = {
      sessionId: testSession.sessionId,
      documentId: 'test_doc_123',
      role: 'user',
      content: 'This is a test question for MongoDB connection verification.',
      timestamp: new Date(),
      messageId: `test_user_${Date.now()}`
    };

    const assistantMessage = {
      sessionId: testSession.sessionId,
      documentId: 'test_doc_123',
      role: 'assistant',
      content: 'This is a test response to verify MongoDB Atlas is working correctly.',
      timestamp: new Date(),
      messageId: `test_assistant_${Date.now()}`,
      confidence: 0.95,
      sourceType: 'test',
      sources: [{
        type: 'test',
        title: 'Test Source',
        confidence: 0.95,
        content: 'Test content for verification'
      }],
      processingTime: 150,
      tokenUsage: {
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40
      },
      csEnhanced: true,
      ragVersion: '2.0-test'
    };

    const savedUserMessage = await ChatService.saveMessage(userMessage);
    const savedAssistantMessage = await ChatService.saveMessage(assistantMessage);
    
    console.log('💾 User message saved:', savedUserMessage.messageId);
    console.log('💾 Assistant message saved:', savedAssistantMessage.messageId);
    console.log('✅ Message saving test passed\n');

    // Test 5: Retrieve Chat History
    console.log('5️⃣ Testing chat history retrieval...');
    const chatHistory = await ChatService.getChatHistory(testSession.sessionId);
    console.log('📜 Retrieved messages:', chatHistory.length);
    console.log('✅ Chat history retrieval test passed\n');

    // Test 6: Get Document Statistics
    console.log('6️⃣ Testing document statistics...');
    const docStats = await ChatService.getDocumentChatStats('test_doc_123');
    console.log('📊 Document stats:', JSON.stringify(docStats, null, 2));
    console.log('✅ Document statistics test passed\n');

    // Test 7: Cleanup Test Data
    console.log('7️⃣ Cleaning up test data...');
    const deleteResult = await ChatService.deleteDocumentChats('test_doc_123');
    console.log('🗑️ Cleanup result:', JSON.stringify(deleteResult, null, 2));
    console.log('✅ Cleanup test passed\n');

    // Final Success
    console.log('🎉 ALL TESTS PASSED! MongoDB Atlas is properly configured.\n');
    console.log('✨ Your chat persistence system is ready to use!\n');
    
    console.log('📋 Next steps:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Navigate to a document Q&A page');
    console.log('3. Ask questions - they will be saved to MongoDB Atlas');
    console.log('4. Delete documents - associated chats will be automatically cleaned up\n');

  } catch (error) {
    console.error('❌ MongoDB Atlas test failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Check your MONGODB_URI in .env.local');
    console.error('2. Verify your MongoDB Atlas cluster is running');
    console.error('3. Check network access settings (IP whitelist)');
    console.error('4. Verify database user credentials and permissions');
    console.error('5. See MONGODB_SETUP.md for detailed setup instructions\n');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testMongoDBConnection()
    .then(() => {
      console.log('🏁 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testMongoDBConnection };