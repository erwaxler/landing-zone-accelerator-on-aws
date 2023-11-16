# Developing

## Development Dependencies

The section outlines the development toolchain for Landing Zone Accelerator.

#### System dependencies

 - **NodeJS 16.x** or above - [NodeJS](https://nodejs.org/en/) must be installed on your system
 - **AWS CDK CLI** - [AWS CDK tookit CLI](https://www.npmjs.com/package/aws-cdk) must be installed via NPM
 - **Yarn** - [Yarn dependency manager](https://www.npmjs.com/package/yarn) must be installed via NPM

#### Core dependencies

 - **aws-cdk-lib** - AWS CDK library
 - **constructs** - AWS constructs library
 - **esbuild** - used to package and minify JavaScript code
 - **eslint** - used to provide rules for code quality
 - **jest** - unit testing framework
 - **jsii** - allows code in any language to naturally interact with JavaScript classes
 - **lerna** - used to manage the multiple packages in the project
 - **ts-node** - execution environment for TypeScript
 - **typedoc** - used to document libraries built for the accelerator
 - **typescript** - project is written in TypeScript

#### Additional dependencies/plugins

 - **@types/jest** - TypeScript type definitions for jest unit testing framework
 - **@types/node** - TypeScript type definitions for NodeJS
 - **@typescript-eslint/eslint-plugin** - TypeScript plugin for eslint
 - **@typescript-eslint/parser** - allows eslint to parse TypeScript code
 - **eslint-config-prettier** - turns off all rules that are unnecessary or might conflict with Prettier
 - **eslint-plugin-jest** - jest plugin for eslint
 - **eslint-plugin-prettier** - runs Prettier as an ESLint rule and reports differences as individual ESLint issues
 - **fs-extra** - adds file system methods that aren't included in the native fs module and adds promise support to the fs methods
 - **jest-junit** - A Jest reporter that creates compatible junit xml files
 - **jsii-pacmak** - Generates ready-to-publish language-specific packages for jsii modules
 - **ts-jest** - A Jest transformer with source map support that lets you use Jest to test projects written in TypeScript

## Core Command Line Interface (CLI)

The Landing Zone Accelerator CDK application is invoked using a custom-built implementation of the CDK toolkit. The implementation has additional context option flags that can be used to target pipeline stages, specific accounts, and other attributes. Users can invoke the accelerator pipeline stages locally using this CLI, or programmatically in sequence by running AWSAccelerator-Pipeline. Invoking stages locally can speed up development cycles by enabling developers to focus on deployment of a single stage, or help more advanced users of the solution to quickly deploy targeted updates to an environment. 

> **Before using the CLI:** 
> 1. Ensure you have credentials for your accelerator management account set as [environment variables](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) or as an [AWS CLI profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
> 2.  Change your local working directory (starting from the root directory of the project): `cd source/packages/\@aws-accelerator/accelerator`

> :warning: Local use of the CLI should be used with caution. Configuration changes deployed via this method do not have an approval/diff gate by default. You can add an approval gate to deploy operations by appending the following option: `--require-approval any-change`

**Example usage of the CLI:**
`yarn run ts-node --transpile-only cdk.ts <toolkit_command> <options>`

Native toolkit commands and options can be found in the [AWS CDK Toolkit reference](https://docs.aws.amazon.com/cdk/v2/guide/cli.html).

**Accelerator-specific context options:**

`--account`        The AWS account ID to deploy the pipeline stage

`--config-dir`     The local directory where the accelerator configuration files are stored

`--partition`      The AWS partition to deploy the pipeline stage

`--region`         The AWS region to deploy the pipeline stage

`--stage`          The pipeline stage to deploy. Stage names can be found in the [accelerator-stage.ts](https://github.com/awslabs/landing-zone-accelerator-on-aws/blob/main/source/packages/%40aws-accelerator/accelerator/lib/accelerator-stage.ts) file.

**Example synth command:**
`yarn run ts-node --transpile-only cdk.ts synth --stage network-vpc --require-approval any-change --config-dir /path/to/aws-accelerator-config/ --partition aws --region <region> --account <REDACTED>`

**Example deploy command:**
`yarn run ts-node --transpile-only cdk.ts deploy --stage network-vpc --require-approval any-change --config-dir /path/to/aws-accelerator-config/ --partition aws --region <region> --account <REDACTED> --app cdk.out`

## Configuration Validator

The accelerator has a helper script that runs config validation on a provided configuration directory. This script is run during the Build stage of the pipeline, but may also be run locally if the development toolchain is installed.

**Example usage of the CLI:**
`yarn run ts-node --transpile-only config-validator.ts /path/to/aws-accelerator-config/`

>Alternative syntax: `yarn validate-config /path/to/aws-accelerator-config/`

## Helper Scripts

Several helper scripts are built into the project that support performing common actions across the monorepo. These scripts are contained within ./source/package.json.
> When scripts are run from the **./source** directory, the scope is the entire monorepo. They can also be run for each package under their respective directories.

 - `yarn build` - compiles TypeScript code into JavaScript
 - `yarn cleanup` - removes compiled TypeScript code, Node modules, and other build artifacts from the local repo
 - `yarn cleanup:tsc` - removes only compiled TypeScript code
 - `yarn docs` - generate TypeDocs
 - `yarn generate-all-docs` - generate TypeDocs for all versions of the solution (only available in **./source** directory)
 - `yarn install` - install package dependencies
 - `yarn lint` - run ESLint
 - `yarn prettier` - run Prettier
 - `yarn test` - run unit tests
 - `yarn test:clean` - remove test reports
 - `yarn validate-config /path/to/aws-accelerator-config` - shorthand for the configuration validator script documented in the previous section
 - `yarn update-snapshots` - verify current release version and automatically update snapshots

## Architecture and Design Philosophy

This section outlines the overall design and patterns used in the Landing Zone Accelerator to automate the deployment of AWS resources. For additional information, please see the [Architecture overview](https://docs.aws.amazon.com/solutions/latest/landing-zone-accelerator-on-aws/architecture-overview.html) and [Architecture details](https://docs.aws.amazon.com/solutions/latest/landing-zone-accelerator-on-aws/architecture-details.html) sections of the Implementation Guide.

### Overall Deployment Strategy

The LZA takes a configuration-based approach to deploying AWS resources across a set of AWS accounts we will refer to as the "deployment environment." The LZA pipeline ingests a set of configuration files provided by the user and transforms the desired configuration to a set of AWS CloudFormation stacks synthesized using the AWS CDK. These stacks are deployed via AWS CodePipeline in a logically ordered set of [stages](https://docs.aws.amazon.com/solutions/latest/landing-zone-accelerator-on-aws/awsaccelerator-pipeline.html) to account for dependencies between various resources.

Most stages of the [core pipeline](https://docs.aws.amazon.com/solutions/latest/landing-zone-accelerator-on-aws/awsaccelerator-pipeline.html) initiate an AWS CodeBuild job that runs the Core Command Line Interface (above) with appropriate arguments. The two most commonly run toolkit commands are **synth** and **deploy** to synthesize and deploy the CloudFormation templates. For example, during the Logging stage the following commands are run:
```
// Synthesize CloudFormation templates
yarn run ts-node --transpile-only cdk.ts synth --stage operations --config-dir /path/to/aws-accelerator-config/ --partition aws

// Deploy CloudFormation templates
yarn run ts-node --transpile-only cdk.ts deploy --stage network-vpc --require-approval any-change --config-dir /path/to/aws-accelerator-config/ --partition aws --app cdk.out
```

These commands execute the core logic of the CDK, contained in `source/packages/@aws-accelerator/accelerator`. Specifically, this command uses `cdk.ts` as an entrypoint to invoke `lib/accelerator.ts`, which executes parallel instances of `lib/toolkit.ts` to each synthesize or deploy a single CloudFormation stack for each unique pair of account and region in the deployment environment. The above command would synthesize a set of CloudFormation stacks with names following the pattern:
```
AWSAccelerator-LoggingStack-${ACCOUNT_ID}-${REGION}
```

### Accelerator

The accelerator module includes the core LZA engine logic and defines each stack deployed by the LZA pipeline.
#### Stacks

AWS resources deployed by LZA are grouped by function as described in the [core pipeline](https://docs.aws.amazon.com/solutions/latest/landing-zone-accelerator-on-aws/awsaccelerator-pipeline.html) page. For each stage, there is at least one corresponding class located in `source/packages/@aws-accelerator/accelerator/lib/stacks`. Using our example above, the logic defining the contents of the Logging stack is defined in `accelerator/lib/stacks/logging-stack.ts`. The logic contained in the stack evaluates the parsed configuration and accordingly adds CloudFormation resources and CDK [constructs](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html) to define the AWS resources in scope.

#### When would I add or modify a stack?

Changes are made at the stack level when creating new resources via LZA or modifying the deployment method for existing deployments. Most feature requests will require changes to at least one Stack class.

### Config

The accepted format of the YAML files defined in the `aws-accelerator-config` configuration repository is defined within `source/packages/@aws-accelerator/config`. For example, valid types within the `global-config.yaml` are defined in `config/lib/global-config.ts`. Within these classes we determine the accepted properties and options for the deployment of AWS services. This module also includes a `/validation` subdirectory that contains code to verify the customer-provided set of YAML files is valid during the Build phase of the pipeline. 

#### When would I add or modify a config?

Changes are made to the config files when enabling the creation of new resource types via LZA or adding additional configuration options. This is a good place to start development of a new feature as it forces you to consider the options to provide customers when using a new feature.

### Constructs

As defined by CDK:
> Constructs are the basic building blocks of AWS CDK apps. A construct represents a "cloud component" and encapsulates everything AWS CloudFormation needs to create the component.

LZA uses constructs to abstract more complex logic from the Stack classes to modular, well-defined components. Constructs may be used to deploy a single CloudFormation resource, a set of related resources, or any custom resources required by the Stacks. The LZA includes its constructs in the `source/packages/@aws-accelerator/constructs` directory.

#### When would I add or modify a construct?

Constructs are created or modified when there is a significant code addition to facilitate the deployment of new resources. Constructs should be used to minimize the amount of business logic with the Stack classes.
## Feature development

This section outlines guidance for developing features for Landing Zone Accelerator.

### Deploying resource dependencies via Landing Zone Accelerator

When developing features for the accelerator, you may encounter situations where resources in one stack may need to reference resources created in prior stages of the pipeline. This is especially true if you need to ensure a certain resource is available in all accounts and regions managed by the solution before that resource is consumed by subsequent stacks (e.g. cross-account IAM roles, S3 buckets). `DependenciesStack` has been introduced to the pipeline for this use case. Deployed during the `Key` stage of the pipeline, any resources added to this stack may be utilized globally by the accelerator in subsequent stacks. This stack may be considered a means to "bootstrap" the environment with accelerator-specific (non-CDK) dependencies.

The `DependenciesStack` may be found in `./source/packages/@aws-accelerator/accelerator/stacks/dependencies-stack.ts`.

### Resource availability by region or partition

The LZA is built to manage the deployment of AWS resources across all available partitions and regions. As new services and features are released, there is often a lack of feature parity across these regions or partitions. The LZA team has made the decision not to create guardrails blocking customers from deploying elective resources to regions or partitions where they are unavailable. This practice requires additional research during the initial implementation, as well as follow-up work to remove the guardrail when the feature becomes available.

When designing a feature not available in all regions/partitions, do not create checks or validations to block deployment or throw an error based on the environment. Customers are ultimately responsible for determining the services and features available in the AWS regions and partitions they deploy to. 

### Adding Validation

The LZA runs a set of validation functions against the provided configuration repository in order to alert customers of syntactical errors. These validations save customers significant time as this can reduce the time for the pipeline to fail in the event of a misconfiguration. This occurs during the `Build` stage of the pipeline, where the CodeBuild project runs the same `config-validator.ts` script referenced in [Configuration Validation](#configuration-validator). This script orchestrates a collection of configuration-file-specific validation classes defined in the `./source/packages/@aws-accelerator/accelerator/config/validator` directory.

When developing a feature that modifies or creates new possible configurations, please ensure you create new validation functions in the appropriate validator class. Examples of common validations include:
- Validate account and organizational unit names referenced in `deploymentTargets` are valid
```
  private validateSsmDocumentDeploymentTargetOUs(
    values: t.TypeOf<typeof SecurityConfigTypes.securityConfig>,
    ouIdNames: string[],
    errors: string[],
  ) {
    for (const documentSet of values.centralSecurityServices.ssmAutomation.documentSets ?? []) {
      for (const ou of documentSet.shareTargets.organizationalUnits ?? []) {
        if (ouIdNames.indexOf(ou) === -1) {
          errors.push(`Deployment target OU ${ou} for SSM documents does not exists in organization-config.yaml file.`);
        }
      }
    }
  }
```
- Validate referenced files exist
```
  private validateTaggingPolicyFile(configDir: string, values: OrganizationConfig, errors: string[]) {
    for (const taggingPolicy of values.taggingPolicies ?? []) {
      if (!fs.existsSync(path.join(configDir, taggingPolicy.policy))) {
        errors.push(`Invalid policy file ${taggingPolicy.policy} for tagging policy ${taggingPolicy.name} !!!`);
      }
    }
  }
```
- Validate AWS service-specific properties
```
  private validateCloudTrailSettings(values: GlobalConfig, errors: string[]) {
    if (
      values.logging.cloudtrail.organizationTrail &&
      values.logging.cloudtrail.organizationTrailSettings?.multiRegionTrail &&
      !values.logging.cloudtrail.organizationTrailSettings.globalServiceEvents
    ) {
      errors.push(
        `The organization CloudTrail setting multiRegionTrail is enabled, the globalServiceEvents must be enabled as well`,
      );
    }
    for (const accountTrail of values.logging.cloudtrail.accountTrails ?? []) {
      if (accountTrail.settings.multiRegionTrail && !accountTrail.settings.globalServiceEvents) {
        errors.push(
          `The account CloudTrail with the name ${accountTrail.name} setting multiRegionTrail is enabled, the globalServiceEvents must be enabled as well`,
        );
      }
    }
  }
```
- Validate resource names for uniqueness
```
  private validateStackNameForUniqueness(
    values: t.TypeOf<typeof CustomizationsConfigTypes.customizationsConfig>,
    errors: string[],
  ) {
    const stackNames = [...(values.customizations?.cloudFormationStacks ?? [])].map(item => item.name);
    const stackSetNames = [...(values.customizations?.cloudFormationStackSets ?? [])].map(item => item.name);

    if (new Set(stackNames).size !== stackNames.length) {
      errors.push(`Duplicate custom stack names defined [${stackNames}].`);
    }

    if (new Set(stackSetNames).size !== stackSetNames.length) {
      errors.push(`Duplicate custom stackset names defined [${stackSetNames}].`);
    }
  }
```

### Snapshot Testing

The LZA currently utilizes [snapshot testing](https://jestjs.io/docs/snapshot-testing) to identify and mitigate unintended consequences of new features. Snapshot testing occurs at the stack level, the config level, and the construct level. 

To update snapshot tests, run the following command from the `source` directory:
```
yarn update-snapshots
```
To execute all tests, change directory to `source` and run
```
yarn test
```

#### Accelerator Test Updates

When developing a new feature, please enable or create the new resource by updating the [all-enabled](https://github.com/awslabs/landing-zone-accelerator-on-aws/tree/main/source/packages/%40aws-accelerator/accelerator/test/configs/all-enabled) and [snapshot-only](https://github.com/awslabs/landing-zone-accelerator-on-aws/tree/main/source/packages/%40aws-accelerator/accelerator/test/configs/snapshot-only)  configuration directory. After updating the configuration, run `yarn test -u` from the `accelerator` directory.
Currently snapshot-only directory files are used for snapshot testing and all-enabled directory files are used for functional test. Gradually snapshot-only directory configuration files will be migrated to all-enabled directory.

[all-enabled](https://github.com/awslabs/landing-zone-accelerator-on-aws/tree/main/source/packages/%40aws-accelerator/accelerator/test/configs/all-enabled) directory configuration files are validated through pre-commit hook. 
To manually validate all-enabled directory config files, change directory to `source` and run 
```
yarn validate-config packages/@aws-accelerator/accelerator/test/configs/all-enabled/
```

#### Config Test Updates

If you create a new config type, please update the appropriate configuration test within `config/test`. After making this update, run `yarn test -u` from the `config` directory.

#### Construct Test Updates

If you create a new construct, please create a new unit test for the construct within `constructs/test`. Similar to the folder structure within `constructs/lib`, these test files are separated by AWS service. After creating a new unit test, run `yarn test -u` from the `constructs` directory.
