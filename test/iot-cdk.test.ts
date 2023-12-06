#!/usr/bin/env zx
import { mqtt, iot, auth } from "aws-iot-device-sdk-v2";

// Creates and returns a MQTT connection using a websockets
function build_connection({
  signingRegion,
  endpoint,
}: {
  signingRegion: string;
  endpoint: string;
}): mqtt.MqttClientConnection {
  let config_builder =
    iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
      region: signingRegion,
      credentials_provider: auth.AwsCredentialsProvider.newDefault(),
    });

  config_builder.with_clean_session(false);
  config_builder.with_client_id(
    "test-" + Math.floor(Math.random() * 100000000)
  );
  config_builder.with_endpoint(endpoint);
  const config = config_builder.build();

  const client = new mqtt.MqttClient();
  return client.new_connection(config);
}

const connection = build_connection({
  signingRegion: "us-west-2",
  endpoint: "a2mbzn72ww18jd-ats.iot.us-west-2.amazonaws.com",
});

// force node to wait 20 seconds before killing itself, promises do not keep node alive
// ToDo: we can get rid of this but it requires a refactor of the native connection binding that includes
//    pinning the libuv event loop while the connection is active or potentially active.
const timer = setInterval(() => {}, 20 * 1000);

console.log("Connecting...");
await connection.connect();
console.log("Connection completed.");
await connection.subscribe(
  "test-topic",
  mqtt.QoS.AtLeastOnce,
  (topic, payload, dup, qos, retain) => {
    const decoder = new TextDecoder("utf8");
    const json = decoder.decode(payload);
    try {
      const message = JSON.parse(json);
      console.log(message);
    } catch (error) {
      console.log("Warning: Could not parse message as JSON...");
    }
  }
);

// Allow node to die if the promise above resolved
clearTimeout(timer);
