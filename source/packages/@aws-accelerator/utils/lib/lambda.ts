import * as cdk from 'aws-cdk-lib';

export const DEFAULT_LAMBDA_RUNTIME = cdk.aws_lambda.Runtime.NODEJS_18_X;
export const CUSTOM_RESOURCE_PROVIDER_RUNTIME = cdk.CustomResourceProviderRuntime.NODEJS_18_X;
