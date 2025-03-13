// TODO: Fix all reply tests
const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const axios = require('axios');

chai.use(chaiHttp);

function generateRandomString() {
  return Math.random().toString(36).substr(2, 10);
}

// SEEDING DATABASE WITH INITIAL VALUES
// ======================================

const THREAD_URL = 'http://localhost:3000/api/threads/h';
const REPLY_URL = 'http://localhost:3000/api/replies/h';
let threads = [];

async function seedDatabase() {
  const MAX_ATTEMPTS = 10;
  const REPLIES_PER_THREAD = 5;
  let count = 0;
  
  while (count < MAX_ATTEMPTS) {
    try {
      const threadPayload = {
        text: generateRandomString(),
        delete_password: generateRandomString()
      };
      
      const threadResponse = await axios.post(THREAD_URL, threadPayload);
      
      if (threadResponse.status !== 200) {
        console.log(`Thread creation failed with status code ${threadResponse.status}`);
        count++;
        continue;
      }
      
      const threadId = threadResponse.data._id;
      
      if (!threadId) {
        console.log("No 'thread_id' field in response.");
        count++;
        continue;
      }
      
      console.log(`Received thread_id: ${threadId}`);
      
      // Store thread data
      let newThread = {
        _id: threadId,
        delete_password: threadResponse.data.delete_password,
        replies: []
      };
      threads.push(newThread);
      
      // Create replies for this thread
      let replyCount = 0;
      while (replyCount < REPLIES_PER_THREAD) {
        const replyPayload = { 
          text: generateRandomString(), 
          delete_password: generateRandomString(), 
          thread_id: threadId 
        };
        
        const replyResponse = await axios.post(REPLY_URL, replyPayload);
        
        if (replyResponse.status !== 200) {
          console.log(`Reply creation failed with status code ${replyResponse.status}`);
          replyCount++;
          continue;
        }
        
        const replyId = replyResponse.data._id;
        if (!replyId) {
          console.log("No 'reply_id' field in response");
          replyCount++;
          continue;
        }
        
        if (replyId === threadId) {
          console.log(`WARNING: Reply ID is identical to Thread ID: ${replyId}`);
        }
        
        console.log(`Received reply Id: ${replyId}`);
        
        newThread.replies.push({
          _id: replyId,
          delete_password: replyResponse.data.delete_password
        });
        
        replyCount++;
        console.log(`-----Reply iteration ${replyCount} complete for thread ${count + 1}---------------`);
      }
    } catch (error) {
      console.error('Error during database seeding:', error.message);
    }
    
    count++;
    console.log(`--- Thread ${count} complete with ${threads[count-1]?.replies.length || 0} replies ---`);
  }
  
  console.log(`Created ${threads.length} threads`);
  
  if (threads.length > 0) {
    const lastThread = threads[threads.length - 1];
    console.log(`Verifying last thread (${lastThread._id}) replies:`);
    
    // Check if replies is an array and has elements
    if (Array.isArray(lastThread.replies) && lastThread.replies.length > 0) {
      for (let j = 0; j < lastThread.replies.length; j++) {
        console.log("++++++++++++++++++++++++++++++++++++++++++++++++");
        console.log(`Reply ${j+1} ID: ${lastThread.replies[j]._id}`);
        console.log(`Is different from thread ID: ${lastThread.replies[j]._id !== lastThread._id}`);
        console.log("++++++++++++++++++++++++++++++++++++++++++++++++");
      }
    } else {
      console.log("No replies found for the last thread.");
    }
  }

  return threads;
}


before (async function(){
  this.timeout(200000); // yes, 2 minutes you bozo
  await seedDatabase();
});


// =====================================
// TESTS START HERE
// =====================================

suite('Functional Tests', function() {
test('Creating a new thread', function(done) {
  chai.request(server)
  .post('/api/threads/fcc_test')
  .send({
    "text": generateRandomString(),
    "delete_password": generateRandomString()
  })
  .end(function(err, res) {
    assert.isNull(err);
    assert.equal(res.status, 200);
    assert.property(res.body, "text");
    assert.isString(res.body.text);
    assert.property(res.body, "created_on");
    assert.isString(res.body.created_on);
    assert.property(res.body, "bumped_on");
    assert.isString(res.body.bumped_on);
    assert.property(res.body, "reported");
    assert.isBoolean(res.body.reported);
    assert.property(res.body, "delete_password");
    assert.isString(res.body.delete_password);
    assert.property(res.body, "replies");
    assert.isArray(res.body.replies);
    done();
  })
})

test('Viewing the 10 most recent threads with 3 replies each' , function(done) {
  chai.request(server)
  .get(`/api/replies/fcc_test?thread_id=${threads[threads.length - 1]._id}`)
  .end(function(err, res) {
    assert.isNull(err);
    assert.equal(res.status, 200);
    assert.property(res.body, "text");
    assert.isString(res.body.text);
    assert.property(res.body, "created_on");
    assert.isString(res.body.created_on);
    assert.property(res.body, "bumped_on");
    assert.isString(res.body.bumped_on);
    // These should not be sent to the client
    assert.notProperty(res.body, "reported");
    assert.notProperty(res.body, "delete_password");

    done();
  })
})

// DONE
test('Deleting a thread with the incorrect password' , function(done) {
  chai.request(server)
  .delete('/api/threads/fcc_test')
  .send({
    "thread_id": threads[threads.length - 1]._id,
    "delete_password": generateRandomString(), // Invalid password, remember?
  })
  .end(function(err, res) {
    assert.equal(res.status, 401);
    assert.isString(res.text);
    console.log(`Res.text is ${res.text}`)
    assert.equal(res.text, "incorrect password");
    done();
  })
})


// DONE
test('Deleting a thread with the correct password' , function(done) {
  chai.request(server)
  .delete('/api/threads/fcc_test')
  .send({
    // Deleting the first thread
    "thread_id": threads[0]._id,
    "delete_password": threads[0].delete_password, 
    })
  .end(function(err, res) {
    assert.equal(res.status, 200);
    assert.isString(res.text);
    assert.equal(res.text, "success");
    done();
  })
})

// DONE
test('Reporting a thread', function(done) {
  chai.request(server)
  .put('/api/threads/fcc_test')
  .send({
    "thread_id": threads[1]._id,
    })
  .end(function(err, res) {
    assert.isNull(err);
    assert.equal(res.status, 200);
    assert.isString(res.text);
    assert.equal(res.text, "reported");
    done();
  })
})

test('Creating a new reply', function(done) {
  chai.request(server)
  .post('/api/replies/fcc_test')
  .send({
    "text": generateRandomString(),
    "delete_password": generateRandomString(),
    "thread_id": threads[threads.length - 1]._id
  })
  .end(function(err, res) {
    assert.isNull(err);
    assert.equal(res.status, 200);
    assert.property(res.body, "text");
    assert.isString(res.body.text);
    assert.property(res.body, "created_on");
    assert.isString(res.body.created_on);
    assert.property(res.body, "reported");
    assert.isBoolean(res.body.reported);
    assert.property(res.body, "delete_password");
    assert.isString(res.body.delete_password);
    done();
  })
})

test('Viewing a single thread with all replies', function(done) {
  chai.request(server)
  .get(`/api/replies/fcc_test?thread_id=${threads[threads.length - 1]._id}`)
  .end(function(err, res) {
    assert.isNull(err);
    assert.equal(res.status, 200);
    assert.property(res.body, "text");
    assert.isString(res.body.text);
    assert.property(res.body, "created_on");
    assert.isString(res.body.created_on);
    assert.property(res.body, "bumped_on");
    assert.isString(res.body.bumped_on);
    assert.property(res.body, "replies");
    assert.isArray(res.body.replies);
    assert.property(res.body, "_id");
    assert.isString(res.body._id);
    // These should not be sent to the client
    assert.notProperty(res.body, "reported");
    assert.notProperty(res.body, "delete_password");
    done();
  })
})

test('Deleting a reply with incorrect password', function(done) {
  chai.request(server)
  .delete('/api/replies/fcc_test')
  .send({
    "thread_id": threads[2]._id,
    "reply_id": threads[2].replies[0]._id,
    "delete_password": generateRandomString(), // incorrect password
    })
  .end(function(err, res) {
    console.log(`err is ${err}`)
    assert.equal(res.status, 401);
    assert.isString(res.text);
    assert.equal(res.text, "incorrect password");
    done();
  })
})

test('Deleting a reply with correct password', function(done) {
  chai.request(server)
  .delete('/api/replies/fcc_test')
  .send({
    "thread_id": threads[threads.length - 2]._id,
    "reply_id": threads[threads.length - 2].replies[0]._id,
    "delete_password": threads[threads.length - 2].replies[0].delete_password //  very correct password
    })
  .end(function(err, res) {
    assert.equal(res.status, 200);
    assert.isString(res.text);
    assert.equal(res.text, "success");
    done();
  })
})


test('Reporting a reply', function(done) {
  chai.request(server)
  .put('/api/replies/fcc_test')
  .send({
    "thread_id": threads[3]._id,
    "reply_id": threads[3].replies[0]._id,
    })
  .end(function(err, res) {
    assert.isNull(err);
    assert.equal(res.status, 200);
    assert.isString(res.text);
    assert.equal(res.text, "reported");
    done();
  })
})
});