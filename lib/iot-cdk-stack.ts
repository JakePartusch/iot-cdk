import * as cdk from "aws-cdk-lib";
import * as iot from "aws-cdk-lib/aws-iot";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { ThingWithCert } from "cdk-iot-core-certificates";
import { CfnOutput } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as path from "path";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class IotCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambda = new NodejsFunction(this, "IotPublishLambda", {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      entry: path.join(__dirname, "iot-publish.ts"),
      bundling: {
        nodeModules: ["aws-crt"],
      },
      timeout: cdk.Duration.seconds(30),
    });

    lambda.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["iot:*"],
        resources: ["*"],
      })
    );
  }
}
