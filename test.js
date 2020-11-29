const MongoClient = require("mongodb").MongoClient;
const client = require("@mailchimp/mailchimp_marketing");
const axios = require("axios");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
client.setConfig({
  apiKey: process.env.MAILCHIMP_KEY,
  server: process.env.MAILCHIMP_ADDRESS,
});

const getInfo = () =>
  MongoClient.connect(uri, { useUnifiedTopology: true }, function (err, db) {
    if (err) throw err;
    const dbo = db.db("userdb");
    dbo
      .collection("users")
      .find({}, { projection: { name: 1, email: 1, _id: 0 } })
      .toArray(function (err, result) {
        if (err) throw err;
        const runId = async () => {
          const response = await client.lists.getAllLists();
          const listId = response.lists[0].id;
          result.forEach((x) => {
            const subscribingUser = {
              firstName:
                x.name.charAt(0).toUpperCase() +
                x.name.slice(1, x.name.indexOf(" ")),
              lastName: x.name.substr(x.name.indexOf(" ") + 1),
              email: x.email,
            };
            async function run() {
              try {
                const response = await client.lists.addListMember(listId, {
                  email_address: subscribingUser.email,
                  status: "subscribed",
                  merge_fields: {
                    FNAME: subscribingUser.firstName,
                    LNAME: subscribingUser.lastName,
                  },
                });
                console.log(
                  `Successfully added contact as an audience member. The contact's id is ${response.id}.`
                );
              } catch (err) {
                console.log("oops"); // this error happens when we try adding an existing email
                // i tried to add a cache but mailchimp is weird and limits me to see only 1000
                // members so i decided to use the try-catch for a long term solution
              }
            }
            try {
              run();
            } catch (err) {
              // simply tries adding an email to mailchimp
              axios
                .post(process.env.SLACK_URL, {
                  text: "Mailchimp API is broken :negative squared_cross_mark:",
                })
                .then(function (response) {
                  console.log(response);
                })
                .catch(function (error) {
                  console.log(error);
                });
            }
          });
        };
        try {
          runId();
        } catch (err) {
          axios
            .post(process.env.SLACK_URL, {
              text: "MailChimp API broken :negative_squared_cross_mark:",
            })
            .then(function (response) {
              console.log(response);
            })
            .catch(function (error) {
              console.log(error);
            });
        } // get respective list id and adds a subscribing user to the list
        axios
          .post(process.env.SLACK_URL, {
            text: "Read succeeded :white_check_mark:",
          })
          .then(function (response) {
            console.log(response);
          })
          .catch(function (error) {
            console.log(error);
          });
        db.close();
      });
  });
try {
  getInfo();
} catch (err) {
  axios
    .post(process.env.SLACK_URL, {
      text: "Connection to MongoDB failed :negative_squared_cross_mark:",
    })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
}
