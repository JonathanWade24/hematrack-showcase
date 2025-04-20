import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export class InfrastructureBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Configuration --- 
    const vpcId = 'vpc-0444ffd1293b292f5';
    const lambdaSecurityGroupId = 'sg-02d7ff02defdf15a2';
    const privateSubnetIds = [
      'subnet-0234df86c748b7c12',
      'subnet-018bf3c60a43dc69e',
      'subnet-0c352abbe489b3865',
      'subnet-01a2452436dad8919',
      'subnet-07524888832a5da61',
      'subnet-0870a8759ba94016d',
    ];
    const dbSecretArn = 'arn:aws:secretsmanager:us-east-1:557690625517:secret:rds!cluster-75373115-e8ea-43b8-92a7-7ca4314ea218-t2IVsO';
    const dbHost = 'omicsdb-instance-1.cr2c0y2cycd2.us-east-1.rds.amazonaws.com';
    const dbPort = '5432';
    const dbName = 'omicsdb';

    // --- Look up existing VPC resources --- 
    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVpc', {
      vpcId: vpcId,
    });

    const lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ImportedSg', lambdaSecurityGroupId);

    const privateSubnets = privateSubnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `ImportedSubnet${index}`, subnetId)
    );

    // --- Define Lambda Function --- 
    const getDataFunction = new lambdaNodeJs.NodejsFunction(this, 'GetDataHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      // Path is relative to the location of this file (infrastructure_backend/lib)
      entry: path.join(__dirname, '../src/handlers/data.ts'), 
      handler: 'get', 
      vpc: vpc,
      vpcSubnets: {
        subnets: privateSubnets,
      },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        NODE_ENV: 'dev', // Or determine dynamically based on CDK context/stage
        DB_SECRET_ARN: dbSecretArn,
        DB_HOST: dbHost,
        DB_PORT: dbPort,
        DB_NAME: dbName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1', // Recommended for SDK v3 efficiency
      },
      timeout: cdk.Duration.seconds(30), // Example timeout
      memorySize: 512, // Example memory
      bundling: {
        // Ensure pg is bundled. NodejsFunction tries to be smart, but explicitly include dependencies if needed.
        nodeModules: ['pg', '@aws-sdk/client-secrets-manager'], // Force include these in the bundle
        // externalModules: [], // Don't exclude AWS SDK if bundling it
      },
    });

    // --- Grant Permissions --- 
    // Grant permission to read the specific secret
    const secret = secretsmanager.Secret.fromSecretCompleteArn(this, 'ImportedSecret', dbSecretArn);
    secret.grantRead(getDataFunction);

    // Explicitly add the GetSecretValue permission (belt-and-suspenders approach)
    getDataFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [dbSecretArn],
      effect: iam.Effect.ALLOW,
    }));

    // Note: Permissions for VPC ENI creation/management are automatically added 
    // by CDK when assigning a Lambda to a VPC.

    // --- Define API Gateway --- 
    const httpApi = new apigwv2.HttpApi(this, 'HematrackHttpApi', {
      description: 'HTTP API for Hematrack Backend',
      corsPreflight: { // Example CORS config - adjust as needed for your frontend
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST, // Add other methods if needed
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowCredentials: true,
        allowOrigins: ['http://localhost:3000'], // Replace '*' with specific origins. Add your production URL here later.
      },
    });

    // --- Define Integration & Route --- 
    const getDataIntegration = new apigwv2Integrations.HttpLambdaIntegration('GetDataIntegration', getDataFunction);

    httpApi.addRoutes({
      path: '/data/{table}',
      methods: [apigwv2.HttpMethod.GET],
      integration: getDataIntegration,
    });

    // --- Output API Endpoint --- 
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      description: 'API Gateway endpoint URL',
      value: httpApi.url!,
    });
  }
}
