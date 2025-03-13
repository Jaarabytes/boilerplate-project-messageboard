'use strict';

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
.catch((err) => console.log(`Error connecting to mongodb: ${err}`))
// Connection done!

// App routing starts here
module.exports = function (app) {
 /*
  *
  *
  *
  *
  ENTERING THE /threads MINES
  *
  *
  *
  */ 
 
  app.route('/api/threads/:board')
  .post(async (req, res) => {
    console.log('===================================');
    console.log('@ POST /api/threads/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    const { text, delete_password } = req.body;
    console.log(`Text is ${text} and delete_password is ${delete_password}`);
    try {
      const newThread = new Thread({text: text, created_on: new Date(), bumped_on: new Date(), reported: false, delete_password: delete_password, replies: []});
      const savedThread = await newThread.save();
      console.log(`To be returned thread looks like ${JSON.stringify(savedThread)}`);
      //TODO: get rid of the _v0 and return _id
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
      const result = await Thread.aggregate([
        { $sort: { _id: -1 } },
        { $limit: 10 },
        {
          $addFields: {
            replies: { $slice: ["$replies", -3] }
          }
        },
        {
          $project: {
            _id: 0,
            delete_password: 0,
            __v: 0,
            reported: 0,
            "replies.delete_password": 0,
            "replies.__v": 0,
            "replies.reported": 0,
            "replies._id": 0
          }
        }
      ]).exec();      
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
      // Test now, if it works
      const specificThread = await Thread.findById(thread_id);
      if (delete_password == specificThread.delete_password) {
          // delete below and make more efficient
        console.log("Thread found. Here: ", JSON.stringify(specificThread))
        await Thread.findByIdAndDelete(thread_id); // delete the whole thread
        console.log("Success")
        return res.status(200).send("success");
      } else {
          console.log("incorrect password");
          return res.status(401).send("incorrect password");
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
      if (specificThread) {
        specificThread.reported = true; // change reported to true
        const answerThread = await specificThread.save();
        console.log(`The whole answer thread looks like ${JSON.stringify(answerThread)}`);
        console.log("reported");
        return res.send("reported");
      } else {
        console.log("Thread not found");
        return res.send("Thread not found");
      }
    }
    catch( err ) {
      console.log(`Error @ PUT /api/threads/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error putting a thread"})
    }
  });


  /*
  *
  *
  *
  *
  ENTERING THE /replies MINES
  *
  *
  *
  */ 
  
  app.route('/api/replies/:board')
  .post(async (req, res) => {
    console.log('===================================');
    console.log('@ POST /api/replies/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);
    const { text, delete_password, thread_id} = req.body;
    console.log(`Text is ${text}, thread id is ${thread_id} and delete_password is ${delete_password}`);
    try {
      // Update the thread with the new reply and update the bumped_on date
        // Update the thread with the new reply and update the bumped_on date
        await Thread.updateOne(
          { _id: thread_id }, 
          { 
            $set: { bumped_on: new Date() }, 
            $push: { 
              replies: { 
                _id: new mongoose.Types.ObjectId(), // This ensures a unique ID for the reply
                text: text, 
                delete_password: delete_password,
                created_on: new Date() // Adding created_on to match your sort
              } 
            }
          }
        );

        // Get the newly created reply
        const postedReply = await Thread.findOne(
          { _id: thread_id },
          { replies: { $slice: -1 } } // Get only the last reply (most recently added)
        );

        console.log(`Posted Reply is actually ${JSON.stringify(postedReply?.replies[0])}`);

        // Return just the reply object
        return res.json(postedReply?.replies[0]);
    } catch (error) {
      console.error("Error posting reply:", error);
      return res.status(500).json({ error: "Failed to post reply" });
    }  
  })
  .get(async (req, res) => {
    console.log('===================================');
    console.log('@ GET /api/replies/:board');
    console.log(`Request parameters look like: ${JSON.stringify(req.params)}`);
    console.log(`Request body look like: ${JSON.stringify(req.body)}`);  
    const { thread_id } = req.query;
    console.log(`Thread_id looks like ${thread_id}`)
    try {
      const result = await Thread.findById(thread_id, {__v: 0, delete_password: 0, reported: 0});
      console.log(`The result looks like: ${JSON.stringify(result)}`);
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
      console.log(`Specific Thread looks like ${JSON.stringify(specificThread)}`)
      if ( !specificThread ) {
        console.log(`Error: specific thread not found`);
      }
      const specificReply = specificThread.replies.find(reply => reply._id.toString() == reply_id);
      console.log(`Specific Reply looks like ${JSON.stringify(specificReply)}`)
      if ( !specificReply ) {
        console.log(`Error: specific reply not found`);
      }
      if (delete_password == specificReply.delete_password) {
        specificReply.text = "[deleted]"; // change text of the specificReply to [deleted]
        await specificThread.save();
        console.log("success");
        return res.status(200).send("success");
      } else {
        console.log("incorrect password");
        return res.status(401).send("incorrect password");
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
      const specificReply = specificThread.replies.find(reply => reply._id.toString() === reply_id);
      // const specificReply = specificThread.findById(reply_id);
      if (specificReply) {
        specificReply.reported = true; // change reported to true
        const answerThread = await specificThread.save();
        console.log(`The whole answer thread looks like ${JSON.stringify(answerThread)}`);
        console.log("reported")
        return res.send("reported");
      } else {
        console.log("Reply not found")
        return res.send("Reply not found");
      }
    }
    catch( err ) {
      console.log(`Error @ PUT /api/replies/:board`);
      console.error("Error", err);
      return res.status(500).json({error: "Error putting a reply"})
    }})
};

