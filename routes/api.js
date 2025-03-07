
'use strict';
const { spec } = require('mocha/lib/reporters');
// Mongodb + mongoose configuration
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  text: {type: String, required: true},
  created_on: { type: Date, default: Date.now },
  delete_password: {type: String, required: true},
  reported: {type: Boolean, default: false}
});

const threadSchema = new mongoose.Schema({
  text: {type: String, default: Date.now},
  created_on:  { type: Date, default: Date.now },
  bumped_on: {type: Date, default: Date.now},
  reported:  { type: Boolean, default: false },
  delete_password: {type: String, required: true},
  replies: [replySchema]
});

const boardSchema = new mongoose.Schema({
  name: {type: String},
  threads: [threadSchema],
  created_at: { type: Date, default: Date.now }
});

const Board = mongoose.model('Board', boardSchema);
const Thread = mongoose.model('Thread', threadSchema);
const Reply = mongoose.model('Reply', replySchema);
// Configuration ends here

// Connecting to mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser : true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB has connected succesfully"))
.catch((err) => console.log(`Error encountered: ${err}`))
// Connection done!

// App routing starts here
module.exports = function (app) {
  
  app.route('/api/threads/:board')
  .post(async (req, res) => {
    console.log('===================================');
    console.log('@ POST /api/threads/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    const { text, delete_password } = req.body;
    console.log(`Text is ${text} and delete_password is ${delete_password}`);
    // Ni kujaribu tu
    try {
      const newThread = new Thread({text: text, created_on: new Date(), bumped_on: new Date(), reported: false, delete_password: delete_password, replies: []});
      const savedThread = await newThread.save();
      console.log(`To be returned thread looks like ${JSON.stringify(savedThread)}`);
      // get rid of the _v0 and return _id
      return res.json(savedThread);
    }
    catch( err ) {
      console.log(`Error @ POST /api/threads/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error adding to the thread"})
    }})
    
  .get(async (req, res) => {
    console.log('===================================');
    console.log('@ GET /api/threads/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    try {
      const result = await Thread.aggregate([{$sort: {_id: -1}}, {$limit: 10}, {$addFields: {replies: {$slice: ["$replies", -3]}}}]).exec();
      console.log(`The result looks like: ${JSON.stringify(result)}`);
      // reported and delete_password should NOT be sent to client
      res.json(result);
    }
    catch ( err ) {
      console.log(`Error encountered in @ GET /api/threads/:board`);
      console.error(`Error here: ${err}`);
      return res.json({error: "Error when performing GET /api/threads/:board"})
    }
  })
  .delete(async (req, res) => {
    console.log('===================================');
    console.log('@ DELETE /api/threads/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);  
    const { thread_id, delete_password } = req.body;
    console.log(`Thread id is ${thread_id} and delete_password is ${delete_password}`);
    try {
      // Also possible
      // const specificReply = specificThread.replies.find(reply => reply._id.toString() === reply_id);
      // TODO: FIX HERE
      if (delete_password == specificReply.delete_password) {
        await Thread.findByIdAndDelete(thread_id); // delete the whole thread
        return res.text("success");
      } else {
        return res.text("Incorrect password");
      }
    }
    catch( err ) {
      console.log(`Error @ DELETE /api/thread/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error deleting the thread"})
    }
  })
  .put(async (req, res) => {
    console.log('===================================');
    console.log('@ PUT /api/threads/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);  
    const { thread_id } = req.body;
    console.log(`Thread id is ${thread_id}`);
    try {
      const specificThread = await Thread.findById(thread_id);
      if (specificReply) {
        specificThread.reported = true; // change reported to true
        const answerThread = await specificThread.save();
        console.log(`The whole answer thread looks like ${JSON.stringify(answerThread)}`);
        return res.text("reported");
      } else {
        return res.text("Thread not found");
      }
    }
    catch( err ) {
      console.log(`Error @ PUT /api/threads/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error putting a thread"})
    }
  });
    

  // ENTERING THE REPLIES MINES

  app.route('/api/replies/:board')
  .post(async (req, res) => {
    console.log('===================================');
    console.log('@ POST /api/replies/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    const { text, delete_password, thread_id} = req.body;
    console.log(`Text is ${text}, thread id is ${thread_id} and delete_password is ${delete_password}`);
    // Ni kujaribu tu
    try {
      const specificThread = await Thread.findById(thread_id);
      // Find a way to change bumped date
      specificThread.bumped_on = new Date();
      // Just trying here
      specificThread.replies.push({
        text: text,
        created_on: new Date(),
        delete_password: delete_password,
        reported: false,
      });
      //return the _id prop
      const answerThread = await specificThread.save();
      console.log(`The whole answer thread looks like ${JSON.stringify(answerThread)}`);
      return res.json(answerThread);
    }
    catch( err ) {
      console.log(`Error @ POST /api/replies/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error adding a reply"})
    }})
  .get(async (req, res) => {
    console.log('===================================');
    console.log('@ GET /api/replies/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);  
    const { thread_id } = req.query;
    console.log(`Thread_id looks like ${thread_id}`)
    try {
      const result = await Thread.findById(thread_id);
      console.log(`The result looks like: ${JSON.stringify(result)}`);
      // you should exclude some stuff here

      // TODO: CONFIRM the below comment before continuing
      // reported and delete_password should NOT be sent to client
      res.json(result);
    }
    catch ( err ) {
      console.log(`Error encountered in @ GET /api/threads/:board`);
      console.error(`Error here: ${err}`);
      return res.json({error: "Error when performing GET /api/threads/:board"})
    }
  })
  .delete(async (req, res) => {
    console.log('===================================');
    console.log('@ DELETE /api/replies/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    const { thread_id, reply_id, delete_password } = req.body;
    console.log(`Thread id is ${thread_id}, delete_password is ${delete_password} and reply id is ${reply_id}`);
    try {
      // TODO: Fix below
      const specificThread = await Thread.findById(thread_id);
      // Also possible
      // const specificReply = specificThread.replies.find(reply => reply._id.toString() === reply_id);
      const specificReply = specificThread.findById(reply_id);
      if (delete_password == specificReply.delete_password) {
        specificReply._id = "[deleted]"; // change reply_id to [deleted]
        const answerThread = await specificThread.save();
        console.log(`The whole answer thread looks like ${JSON.stringify(answerThread)}`);
        return res.text("success");
      } else {
        return res.text("Incorrect password");
      }
    }
    catch( err ) {
      console.log(`Error @ DELETE /api/replies/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error deleting a reply"})
    }
  })
  .put(async (req, res) => {
    console.log('===================================');
    console.log('@ PUT /api/replies/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    const { thread_id, reply_id } = req.body;
    console.log(`Thread id is ${thread_id} and reply id is ${reply_id}`);
    try {
      const specificThread = await Thread.findById(thread_id);
      // Also possible
      // const specificReply = specificThread.replies.find(reply => reply._id.toString() === reply_id);
      const specificReply = specificThread.findById(reply_id);
      if (specificReply) {
        specificReply.reported = true; // change reported to true
        const answerThread = await specificThread.save();
        console.log(`The whole answer thread looks like ${JSON.stringify(answerThread)}`);
        return res.text("reported");
      } else {
        return res.text("Reply not found");
      }
    }
    catch( err ) {
      console.log(`Error @ PUT /api/replies/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error putting a reply"})
    }})
};

