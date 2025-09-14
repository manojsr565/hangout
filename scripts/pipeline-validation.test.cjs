#!/usr/bin/env node

/**
 * Pipeline Validation Tests
 * 
 * This script validates Azure DevOps pipeline configurations and deployment readiness.
 * It can be run locally or as part of the CI/CD pipeline to ensure everything is configured correctly.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Test helper functions
 */
function test(description, testFn) {
  try {
    console.log(`Testing: ${description}`);
    testFn();
    testResults.passed++;
    console.log(`✅ PASS: ${description}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ description, error: error.message });
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got ${actual}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toMatch: (pattern) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected "${actual}" to match pattern ${pattern}`);
      }
    }
  };
}

/**
 * File existence and structure tests
 */
function validateFileStructure() {
  test('Azure pipeline configuration files exist', () => {
    expect(fs.existsSync('azure-pipelines.yml')).toBe(true);
    expect(fs.existsSync('azure-pipelines-complete.yml')).toBe(true);
  });

  test('Terraform configuration files exist', () => {
    expect(fs.existsSync('terraform/main.tf')).toBe(true);
    expect(fs.existsSync('terraform/variables.tf')).toBe(true);
    expect(fs.existsSync('terraform/outputs.tf')).toBe(true);
  });

  test('Application files exist', () => {
    expect(fs.existsSync('package.json')).toBe(true);
    expect(fs.existsSync('api/package.json')).toBe(true);
    expect(fs.existsSync('App.tsx')).toBe(true);
    expect(fs.existsSync('api/src/functions/submitPlan.ts')).toBe(true);
  });

  test('Test files exist', () => {
    expect(fs.existsSync('api/src/functions/__tests__/submitPlan.integration.test.ts')).toBe(true);
    expect(fs.existsSync('api/src/functions/__tests__/e2e.integration.test.ts')).toBe(true);
    expect(fs.existsSync('src/__tests__/e2e.integration.test.tsx')).toBe(true);
  });
}

/**
 * Pipeline configuration validation
 */
function validatePipelineConfiguration() {
  test('Main pipeline YAML is valid', () => {
    const pipelineContent = fs.readFileSync('azure-pipelines.yml', 'utf8');
    const pipeline = yaml.load(pipelineContent);
    
    expect(pipeline).toBeDefined();
    expect(pipeline.trigger).toBeDefined();
    expect(pipeline.stages).toBeDefined();
    expect(pipeline.stages.length).toBeGreaterThan(0);
  });

  test('Pipeline has required stages', () => {
    const pipelineContent = fs.readFileSync('azure-pipelines.yml', 'utf8');
    const pipeline = yaml.load(pipelineContent);
    
    const stageNames = pipeline.stages.map(stage => stage.stage);
    expect(stageNames).toContain('Build');
    expect(stageNames).toContain('Deploy');
    expect(stageNames).toContain('Validate');
  });

  test('Pipeline variables are properly configured', () => {
    const pipelineContent = fs.readFileSync('azure-pipelines.yml', 'utf8');
    const pipeline = yaml.load(pipelineContent);
    
    expect(pipeline.variables).toBeDefined();
    expect(pipeline.variables.nodeVersion).toBeDefined();
    expect(pipeline.variables.resourceGroupName).toBeDefined();
    expect(pipeline.variables.staticWebAppName).toBeDefined();
    expect(pipeline.variables.functionAppName).toBeDefined();
  });

  test('Build stage includes test execution', () => {
    const pipelineContent = fs.readFileSync('azure-pipelines.yml', 'utf8');
    const pipelineYaml = pipelineContent.toLowerCase();
    
    expect(pipelineYaml).toContain('npm test');
  });

  test('Complete pipeline includes infrastructure stage', () => {
    const pipelineContent = fs.readFileSync('azure-pipelines-complete.yml', 'utf8');
    const pipeline = yaml.load(pipelineContent);
    
    const stageNames = pipeline.stages.map(stage => stage.stage);
    expect(stageNames).toContain('Infrastructure');
  });
}

/**
 * Package.json validation
 */
function validatePackageConfigurations() {
  test('Frontend package.json has required scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.build).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.dev).toBeDefined();
  });

  test('Backend package.json has required scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync('api/package.json', 'utf8'));
    
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.build).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.start).toBeDefined();
  });

  test('Frontend has testing dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies.jest).toBeDefined();
    expect(packageJson.devDependencies['@testing-library/react']).toBeDefined();
  });

  test('Backend has testing dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync('api/package.json', 'utf8'));
    
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies.jest).toBeDefined();
    expect(packageJson.devDependencies['@types/jest']).toBeDefined();
  });
}

/**
 * Terraform configuration validation
 */
function validateTerraformConfiguration() {
  test('Terraform main.tf has required resources', () => {
    const terraformContent = fs.readFileSync('terraform/main.tf', 'utf8');
    
    expect(terraformContent).toContain('azurerm_resource_group');
    expect(terraformContent).toContain('azurerm_static_site');
    expect(terraformContent).toContain('azurerm_linux_function_app');
    expect(terraformContent).toContain('azurerm_communication_service');
  });

  test('Terraform variables are defined', () => {
    const variablesContent = fs.readFileSync('terraform/variables.tf', 'utf8');
    
    expect(variablesContent).toContain('variable');
    expect(variablesContent).toContain('environment');
    expect(variablesContent).toContain('notification_email');
  });

  test('Terraform outputs are defined', () => {
    const outputsContent = fs.readFileSync('terraform/outputs.tf', 'utf8');
    
    expect(outputsContent).toContain('output');
    expect(outputsContent).toContain('static_web_app_url');
    expect(outputsContent).toContain('function_app_name');
  });
}

/**
 * Environment configuration validation
 */
function validateEnvironmentConfiguration() {
  test('Environment example files exist', () => {
    expect(fs.existsSync('.env.example')).toBe(true);
    expect(fs.existsSync('api/local.settings.example.json')).toBe(true);
    expect(fs.existsSync('terraform/terraform.tfvars.example')).toBe(true);
  });

  test('Static Web App configuration exists', () => {
    expect(fs.existsSync('staticwebapp.config.json')).toBe(true);
    
    const config = JSON.parse(fs.readFileSync('staticwebapp.config.json', 'utf8'));
    expect(config).toBeDefined();
  });

  test('Function App host configuration exists', () => {
    expect(fs.existsSync('api/host.json')).toBe(true);
    
    const hostConfig = JSON.parse(fs.readFileSync('api/host.json', 'utf8'));
    expect(hostConfig.version).toBeDefined();
  });
}

/**
 * Test coverage validation
 */
function validateTestCoverage() {
  test('Integration tests cover main functionality', () => {
    const submitPlanTest = fs.readFileSync('api/src/functions/__tests__/submitPlan.integration.test.ts', 'utf8');
    
    expect(submitPlanTest).toContain('should process valid plan submission');
    expect(submitPlanTest).toContain('should handle email service failure');
    expect(submitPlanTest).toContain('should handle rate limiting');
    expect(submitPlanTest).toContain('should validate input data');
  });

  test('E2E tests cover complete user journey', () => {
    const e2eTest = fs.readFileSync('api/src/functions/__tests__/e2e.integration.test.ts', 'utf8');
    
    expect(e2eTest).toContain('Complete User Journey');
    expect(e2eTest).toContain('should handle complete plan submission flow');
    expect(e2eTest).toContain('Cross-Origin Resource Sharing');
    expect(e2eTest).toContain('Performance and Load Testing');
  });

  test('Frontend E2E tests exist', () => {
    const frontendE2eTest = fs.readFileSync('src/__tests__/e2e.integration.test.tsx', 'utf8');
    
    expect(frontendE2eTest).toContain('should complete full plan submission flow');
    expect(frontendE2eTest).toContain('should handle API failure gracefully');
    expect(frontendE2eTest).toContain('Mobile Responsiveness');
    expect(frontendE2eTest).toContain('Accessibility');
  });
}

/**
 * Security configuration validation
 */
function validateSecurityConfiguration() {
  test('Sensitive files are in .gitignore', () => {
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    
    expect(gitignoreContent).toContain('.env');
    expect(gitignoreContent).toContain('local.settings.json');
    expect(gitignoreContent).toContain('terraform.tfstate');
  });

  test('API has proper CORS configuration', () => {
    const submitPlanContent = fs.readFileSync('api/src/functions/submitPlan.ts', 'utf8');
    
    expect(submitPlanContent).toContain('Access-Control-Allow-Origin');
    expect(submitPlanContent).toContain('Access-Control-Allow-Methods');
    expect(submitPlanContent).toContain('Access-Control-Allow-Headers');
  });
}

/**
 * Deployment readiness validation
 */
function validateDeploymentReadiness() {
  test('Deployment scripts exist and are executable', () => {
    expect(fs.existsSync('scripts/deploy-infrastructure.sh')).toBe(true);
    expect(fs.existsSync('scripts/setup-environment.sh')).toBe(true);
    expect(fs.existsSync('scripts/validate-pipeline.sh')).toBe(true);
  });

  test('Documentation files exist', () => {
    expect(fs.existsSync('README.md')).toBe(true);
    expect(fs.existsSync('ENVIRONMENT_CONFIG.md')).toBe(true);
    expect(fs.existsSync('PIPELINE_SETUP.md')).toBe(true);
    expect(fs.existsSync('TROUBLESHOOTING.md')).toBe(true);
  });
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting Pipeline Validation Tests...\n');

  validateFileStructure();
  validatePipelineConfiguration();
  validatePackageConfigurations();
  validateTerraformConfiguration();
  validateEnvironmentConfiguration();
  validateTestCoverage();
  validateSecurityConfiguration();
  validateDeploymentReadiness();

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);

  if (testResults.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.errors.forEach(({ description, error }) => {
      console.log(`   • ${description}: ${error}`);
    });
    
    process.exit(1);
  } else {
    console.log('\n🎉 All pipeline validation tests passed!');
    console.log('✅ Your project is ready for deployment.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateFileStructure,
  validatePipelineConfiguration,
  validatePackageConfigurations,
  validateTerraformConfiguration,
  validateEnvironmentConfiguration,
  validateTestCoverage,
  validateSecurityConfiguration,
  validateDeploymentReadiness
};