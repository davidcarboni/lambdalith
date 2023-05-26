import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { webAppRoutes } from '../src/scloud/cloudfront';
import { zipFunctionTypescript } from '../src/scloud/lambdaFunction';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export default class LambdalithStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'LambdalithQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const api = zipFunctionTypescript(this, 'api');

    const zone = new HostedZone(this, 'zone', {
      zoneName: 'example.com',
    });

    webAppRoutes(this, 'lambdalith', zone, { api: { lambda: api } });
  }
}
