const handler = async (event, context) => {
  console.log("Lambda received event", event);
  return {
    statusCode: 200,
  };
};

module.exports = { handler };
