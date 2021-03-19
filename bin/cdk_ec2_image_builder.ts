#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkEc2ImageBuilderStack } from '../lib/cdk_ec2_image_builder-stack';

const app = new cdk.App();
new CdkEc2ImageBuilderStack(app, 'CdkEc2ImageBuilderStack');
