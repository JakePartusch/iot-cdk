# TODO

- CLI package that connects to websocket and sends messages to a local lambda returning the response on the websocket
  `live-lambda --function MyFunc my-local-lamba.js`
  - Needs to be able to fetch the iot websocket URL
- CDK construct that allows for overriding the lambda function code with the iot router
  - Or maybe it just replaces the lambda directly?
  - How to restore the lambda when we are done?
