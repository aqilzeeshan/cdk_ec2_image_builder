import * as cdk from '@aws-cdk/core';
import * as imagebuilder from '@aws-cdk/aws-imagebuilder';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as ssm from '@aws-cdk/aws-ssm';

export class CdkEc2ImageBuilderStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //https://newsvideo.su/tech/video/391628
    //https://github.com/aws-samples/amazon-ec2-image-builder-samples/blob/master/CloudFormation/Windows/windows-server-2016-with-vscode/windows-server-2016-with-vscode.yml

    const componentBucket = new s3.Bucket(this, 'componet-bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const deployment = new s3Deployment.BucketDeployment(
      this,
      'deployComponentfile',
      {
        sources: [s3Deployment.Source.asset('./component')],
        destinationBucket: componentBucket,
      }
    );

    const imageBuilderLogBucket = new s3.Bucket(this, 'ImageBuilderLogBucket',{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ec2Role = new iam.Role(this,'somerole',{
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
                        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
                        iam.ManagedPolicy.fromAwsManagedPolicyName("EC2InstanceProfileForImageBuilder")
                      ],
      path:'/executionServiceEC2Role/'
    })
    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:s3:::${imageBuilderLogBucket.bucketName}/*`],
      actions: ['s3:PutObject'],
    }));
    //Using instance profile https://gist.github.com/sebsto/ebb66807ac8c6f9148c7580e2da5803d
    const instanceProfile = new iam.CfnInstanceProfile(this,"WindowsImageInstanceProfile",{
      instanceProfileName: "WindowsImageInstanceProfile",
      roles: [ec2Role.roleName]
    })
    
        // Recipe which references the latest (x.x.x) version of Windows Server 2016 English AMI with Desktop Experience).
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-imagebuilder-imagerecipe.html
    const winserverRecipe = new imagebuilder.CfnImageRecipe(this, "WindowsServer2016ImageRecipe", {
      name: 'Windows_Server-2016-VisualStudioCode',
      version: '0.0.1',
      components: [
        { "componentArn": "arn:aws:imagebuilder:us-east-1:aws:component/dotnet-core-runtime-windows/3.1.0" }
      ],
      parentImage: "arn:aws:imagebuilder:us-east-1:aws:image/windows-server-2019-english-core-base-x86/x.x.x",
    })

    // Specifies the infrastructure within which to build and test your image.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-imagebuilder-infrastructureconfiguration.html
    const infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this,"WindowsServer2016ImageInfrastructureConfiguration",{
      name: "WindowsServer-2016-VSCode-Image-Infrastructure-Configuration",
      instanceTypes:["t2.micro"],
      instanceProfileName:instanceProfile.logicalId,
    })

    const pipeline = new imagebuilder.CfnImagePipeline(this,"WindowsImagePipeline",{
      name: "WindowsImagePipeline",
      imageRecipeArn: winserverRecipe.attrArn,
      infrastructureConfigurationArn: infraConfig.attrArn
    })
    
    // The Image resource will show complete in CloudFormation once your image is done building. Use this resource later in your
    // stack to reference the image within other resources.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-imagebuilder-image.html
    const windowServer2016WithVisualStudioCode = new imagebuilder.CfnImage(this,"WindowServer2016WithVisualStudioCode",{
      imageRecipeArn: winserverRecipe.attrArn,
      infrastructureConfigurationArn:infraConfig.attrArn
    })
    
    // Create an SSM Parameter Store entry with our resulting ImageId.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ssm-parameter.html
    const param = new ssm.StringParameter(this, 'WindowServer2016WithVisualStudioCodeParameter', {
         description: 'Image Id for Window Server 2016 With Visual Studio Code',
         parameterName: '/Test/Images/Windows_Server-2016-VisualStudioCode',
         stringValue: windowServer2016WithVisualStudioCode.attrImageId,
    });
    

    
    /*
    const visualStudioCodeComponent = new imagebuilder.CfnComponent(this,"VisualStudioCodeComponent",{
      name: 'VisualStudioCode',
      version: '0.0.1',
      description: 'Install Visual Studio Code',
      changeDescription: 'First Version',
      platform: 'Windows',
      //uri: `s3://${componentBucket.bucketName}/update.yml`,
      uri: 's3://cdkec2imagebuilderstack-componetbucket4f9d826c-17dd80sf6z12t/update.yml'
    });
    */
    
   
  }
}
