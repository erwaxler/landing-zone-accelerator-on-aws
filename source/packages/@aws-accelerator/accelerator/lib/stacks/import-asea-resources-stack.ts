/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { AcceleratorKeyType, AcceleratorStack, AcceleratorStackProps } from './accelerator-stack';
import { AseaStackInfo, DeploymentTargets, AseaResourceMapping, CfnResourceType } from '@aws-accelerator/config';
import { ManagedPolicies } from '../asea-resources/managed-policies';
import { Roles } from '../asea-resources/iam-roles';
import { Groups } from '../asea-resources/iam-groups';
import { Users } from '../asea-resources/iam-users';
import { VpcResources } from '../asea-resources/vpc-resources';
import { AcceleratorStage } from '../accelerator-stage';
import { TransitGateways } from '../asea-resources/transit-gateways';
import { VpcPeeringConnection } from '../asea-resources/vpc-peering-connection';

/**
 * Enum for log level
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface ImportAseaResourcesStackProps extends AcceleratorStackProps {
  /**
   * Current stack info.
   * Retrieved from ASEA CloudFormation stacks
   */
  stackInfo: AseaStackInfo;

  /**
   * Nested Stacks in current stack
   * ASEA creates Nested stacks in Phase1 for VPCs
   */
  nestedStacks?: AseaStackInfo[];

  stage: AcceleratorStage.IMPORT_ASEA_RESOURCES | AcceleratorStage.POST_IMPORT_ASEA_RESOURCES;
}
export class ImportAseaResourcesStack extends AcceleratorStack {
  includedStack: cdk.cloudformation_include.CfnInclude;
  private readonly stackInfo: AseaStackInfo;
  public resourceMapping: AseaResourceMapping[] = [];
  public cloudwatchKey: cdk.aws_kms.IKey;
  public firewallBucket: cdk.aws_s3.IBucket;
  constructor(scope: Construct, id: string, props: ImportAseaResourcesStackProps) {
    super(scope, id, props);
    this.stackInfo = props.stackInfo;
    const nestedStacks: { [stackName: string]: cdk.cloudformation_include.CfnIncludeProps } = {};
    this.cloudwatchKey = this.getAcceleratorKey(AcceleratorKeyType.CLOUDWATCH_KEY);
    this.firewallBucket = cdk.aws_s3.Bucket.fromBucketName(this, 'FirewallLogsBucket', this.centralLogsBucketName);
    this.includedStack = new cdk.cloudformation_include.CfnInclude(this, `stack`, {
      templateFile: this.stackInfo.templatePath,
      preserveLogicalIds: true,
      loadNestedStacks: nestedStacks,
    });
    const nestedStacksInfo = [];
    for (const nestedStack of props.nestedStacks || []) {
      const nestedStackInfo: CfnResourceType | undefined = this.stackInfo.resources.find(
        r => r.resourceType === 'AWS::CloudFormation::Stack' && r.physicalResourceId.includes(nestedStack.stackName),
      );
      if (!nestedStackInfo) {
        throw new Error(`Nested stack "${nestedStack.stackName}" is not found in stack "${props.stackName}"`);
      }
      this.includedStack.loadNestedStack(nestedStackInfo.logicalResourceId, {
        templateFile: nestedStack.templatePath,
      });
      nestedStacksInfo.push({
        ...nestedStack,
        logicalResourceId: nestedStackInfo.logicalResourceId,
      });
    }
    const { policies } = new ManagedPolicies(this, props);
    new Roles(this, { ...props, policies });
    const { groups } = new Groups(this, { ...props, policies });
    new Users(this, { ...props, policies, groups });
    new TransitGateways(this, props);
    new VpcResources(this, { ...props, nestedStacksInfo });
    new VpcPeeringConnection(this, props);
    this.createSsmParameters();
  }

  /**
   * Public accessor method to add ASEA Resource Mapping
   * @param type
   * @param identifier
   */
  public addAseaResource(type: string, identifier: string) {
    this.resourceMapping.push({
      accountId: this.stackInfo.accountId,
      region: this.stackInfo.region,
      resourceType: type,
      resourceIdentifier: identifier,
    });
  }

  /**
   * Public accessor method to add logs to logger
   * @param logLevel
   * @param message
   */
  public addLogs(logLevel: LogLevel, message: string) {
    switch (logLevel) {
      case 'info':
        this.logger.info(message);
        break;

      case 'warn':
        this.logger.warn(message);
        break;

      case 'error':
        this.logger.error(message);
        break;
    }
  }

  getExcludedAccountIds(deploymentTargets: DeploymentTargets): string[] {
    return super.getExcludedAccountIds(deploymentTargets);
  }
}
