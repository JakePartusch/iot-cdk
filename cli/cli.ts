import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { mqtt5, iot } from "aws-iot-device-sdk-v2";
import { toUtf8 } from "@aws-sdk/util-utf8-browser";
import { once } from "events";
import path = require("path");

// Dynamically invoke the javascript functioon by path
const invokeByPath = async (path: string, event: any, context: any) => {
  const { handler: fn } = await import(path);
  const response = await fn(event, context);
  delete require.cache[require.resolve(path)];
  return response;
};

const getIotWebsocketEndpoint = async () => {
  const iot = new IoTClient({});
  const params = {
    endpointType: "iot:Data-ATS",
  };
  return iot.send(new DescribeEndpointCommand(params));
};

const creatClientConfig = ({
  websocketEndpoint,
  region,
}: {
  websocketEndpoint: string;
  region: string;
}) => {
  const builder =
    iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
      websocketEndpoint,
      { region: region }
    );
  builder.withConnectProperties({
    keepAliveIntervalSeconds: 1200,
  });

  return builder.build();
};

function createClient({
  websocketEndpoint,
  region,
}: {
  websocketEndpoint: string;
  region: string;
}): mqtt5.Mqtt5Client {
  let config: mqtt5.Mqtt5ClientConfig = creatClientConfig({
    websocketEndpoint,
    region,
  });

  return new mqtt5.Mqtt5Client(config);
}

// Use the cli argument to invoke the local function
const cli = async ({ region, topic }: { region: string; topic: string }) => {
  const args = process.argv.slice(2);
  //TODO: fully resolve the path
  const requestedFile = args[0];

  //get the path relative to the directory that the cli is run from
  const pathofFileRelativeToCli = path.join(process.cwd(), requestedFile);

  const websocketEndpoint = await getIotWebsocketEndpoint();
  if (!websocketEndpoint.endpointAddress) {
    throw new Error("No websocket endpoint found");
  }

  let client: mqtt5.Mqtt5Client = createClient({
    websocketEndpoint: websocketEndpoint.endpointAddress,
    region,
  });

  const connectionSuccess = once(client, "connectionSuccess");

  client.start();

  await connectionSuccess;

  await client.subscribe({
    subscriptions: [{ qos: mqtt5.QoS.AtLeastOnce, topicFilter: topic }],
  });

  client.on(
    "messageReceived",
    async (eventData: mqtt5.MessageReceivedEvent) => {
      if (eventData.message.payload) {
        const payload = JSON.parse(
          toUtf8(new Uint8Array(eventData.message.payload as ArrayBuffer))
        );
        if (payload.event) {
          const result = await invokeByPath(
            pathofFileRelativeToCli,
            payload.event,
            payload.context
          );
          const publishedResult = {
            context: payload.context,
            result,
          };
          client.publish({
            qos: mqtt5.QoS.AtLeastOnce,
            topicName: topic,
            payload: JSON.stringify(publishedResult),
          });
        }
      }
    }
  );

  setTimeout(() => {}, 2147483647);
};

(async () => {
  await cli({ region: "us-west-2", topic: "test-topic" });
})();
