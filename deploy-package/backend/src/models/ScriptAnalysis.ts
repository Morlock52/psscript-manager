import { Model, DataTypes, Sequelize } from 'sequelize';
import Script from './Script';

export default class ScriptAnalysis extends Model {
  public id!: number;
  public scriptId!: number;
  public purpose!: string;
  public parameters!: object;
  public securityScore!: number;
  public codeQualityScore!: number;
  public riskScore!: number;
  public optimizationSuggestions!: string[];
  public commandDetails!: object[];
  public msDocsReferences!: object[];
  
  // New comprehensive analysis fields
  public securityIssues!: object[];
  public bestPracticeViolations!: object[];
  public performanceInsights!: object[];
  public potentialRisks!: object[];
  public codeComplexityMetrics!: object;
  public compatibilityNotes!: string[];
  public executionSummary!: object;
  public analysisVersion!: string;
  
  // OWASP-specific security fields
  public owaspVulnerabilities!: object[];
  public owaspComplianceScore!: number;
  public injectionRisks!: object[];
  public authenticationIssues!: object[];
  public exposedCredentials!: object[];
  public insecureConfigurations!: object[];
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // References
  public readonly script?: Script;

  static initialize(sequelize: Sequelize) {
    ScriptAnalysis.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      scriptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'scripts',
          key: 'id'
        },
        unique: true,
        field: 'script_id'
      },
      purpose: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      parameters: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'parameter_docs'
      },
      securityScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'security_score'
      },
      codeQualityScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'quality_score'
      },
      riskScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'risk_score'
      },
      optimizationSuggestions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'suggestions'
      },
      commandDetails: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'command_details'
      },
      msDocsReferences: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'ms_docs_references'
      },
      // New comprehensive analysis fields
      securityIssues: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'security_issues',
        comment: 'Detailed security issues found in the script, including severity and remediation steps'
      },
      bestPracticeViolations: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'best_practice_violations',
        comment: 'PowerShell best practice violations based on PSScriptAnalyzer rules'
      },
      performanceInsights: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'performance_insights',
        comment: 'Performance optimization opportunities and insights'
      },
      potentialRisks: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'potential_risks',
        comment: 'Potential risks identified in the script execution or implementation'
      },
      codeComplexityMetrics: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'code_complexity_metrics',
        comment: 'Metrics about code complexity, including cyclomatic complexity, nesting levels, etc.'
      },
      compatibilityNotes: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'compatibility_notes',
        comment: 'Notes about compatibility with different PowerShell versions and environments'
      },
      executionSummary: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'execution_summary',
        comment: 'Summary of script execution behavior, including resources accessed and modified'
      },
      analysisVersion: {
        type: DataTypes.STRING,
        defaultValue: '1.0',
        field: 'analysis_version',
        comment: 'Version of the analysis engine used'
      },
      // OWASP-specific security fields
      owaspVulnerabilities: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'owasp_vulnerabilities',
        comment: 'OWASP Top 10 vulnerabilities found in the script'
      },
      owaspComplianceScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'owasp_compliance_score',
        comment: 'Compliance score based on OWASP guidelines (0-100)'
      },
      injectionRisks: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'injection_risks',
        comment: 'Potential command injection vulnerabilities'
      },
      authenticationIssues: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'authentication_issues',
        comment: 'Authentication and authorization issues'
      },
      exposedCredentials: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'exposed_credentials',
        comment: 'Potentially exposed credentials or secrets'
      },
      insecureConfigurations: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'insecure_configurations',
        comment: 'Insecure configuration settings'
      }
    }, {
      sequelize,
      tableName: 'script_analysis',
      underscored: true
    });
  }

  static associate() {
    ScriptAnalysis.belongsTo(Script, { foreignKey: 'scriptId', as: 'script', foreignKeyConstraint: true });
  }
}
