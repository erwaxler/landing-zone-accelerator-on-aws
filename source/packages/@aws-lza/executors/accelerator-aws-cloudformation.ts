/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import path from 'path';
import { createLogger } from '../common/logger';
import { IGetCloudFormationTemplatesHandlerParameter } from '../interfaces/aws-cloudformation/get-cloudformation-templates';
import { GetCloudFormationTemplatesModule } from '../lib/aws-cloudformation/get-cloudformation-templates';

process.on('uncaughtException', err => {
  throw err;
});

/**
 * Logger
 */
const logger = createLogger([path.parse(path.basename(__filename)).name]);

/**
 * Function to retrieve a list of CloudFormation templates by environment
 * @param input {@link IGetCloudFormationTemplatesHandlerParameter}
 * @returns string
 *
 * @example
 *
 * ```
 * {
 *   stackPrefix: 'AWSAccelerator-NetworkVpc'
 *   directory: './'
 *   roleNameToAssume: 'AWSControlTowerExecution',
 *   centralAccountId: '111111111111',
 *   environments: [
 *     {
 *       accountId: '222222222222',
 *       region: 'us-east-1'
 *     }
 *     ...
 *   ]
 * }
 * ```
 **/
export async function getCloudFormationTemplates(input: IGetCloudFormationTemplatesHandlerParameter): Promise<string> {
  try {
    return await new GetCloudFormationTemplatesModule().handler(input);
  } catch (e: unknown) {
    logger.error(e);
    throw e;
  }
}
