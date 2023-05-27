import { Construct } from 'constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import {
  Bucket, BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { zipFunctionTypescript } from '../src/scloud/lambdaFunction';
import { webAppRoutes } from '../src/scloud/cloudfront';
import { ghaUser } from '../src/scloud/ghaUser';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export default class LambdalithStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Temp hosted zone
    const zone = HostedZone.fromHostedZoneAttributes(this, 'zone', {
      hostedZoneId: 'Z00656221CCUFUCY3NA7J',
      zoneName: 'downloadcreations.com',
    });

    // Lambda for the Node API
    const api = zipFunctionTypescript(this, 'api');

    // Dynamodb tables

    const soldiers = new Table(this, 'soldiers', {
      partitionKey: { name: 'surname', type: AttributeType.STRING },
      sortKey: { name: 'name_dob', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // TODO: remove this so we don't lose data
    });
    soldiers.grantReadData(api);

    const battles = new Table(this, 'battles', {
      partitionKey: { name: 'location', type: AttributeType.STRING },
      sortKey: { name: 'date', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // TODO: remove this so we don't lose data
    });
    battles.grantReadData(api);

    // Cloudfront distribution to serve /api
    // NB this will also create a bucket to host the frontend
    const { distribution } = webAppRoutes(this, 'lambdalith', zone, { '/api/*': { lambda: api } });

    // Bucket for serving /images
    const imagesBucket = new Bucket(this, 'images', {
      encryption: BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true, // TODO: remove this line so we don't lose images!
      removalPolicy: RemovalPolicy.DESTROY, // TODO: remove this line so we don't lose images!
    });

    // Permissions to access the bucket from Cloudfront
    const originAccessIdentity = new OriginAccessIdentity(this, 'oai', {
      comment: 'Cloudfront access to images bucket',
    });
    imagesBucket.grantRead(originAccessIdentity);

    // Add /images path to Cloudfront
    distribution.addBehavior(
      '/images/*',
      new S3Origin(imagesBucket, { originAccessIdentity }),
      { viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS },
    );

    // Github Acrions user access key
    ghaUser(this);
  }
}
