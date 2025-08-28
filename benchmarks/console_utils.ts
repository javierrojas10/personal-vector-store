const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
import { BenchmarkReport, BenchmarkResult, ModelConfig } from './types';

export class ConsoleLogger {
  private spinners: Map<string, any> = new Map();

  // Header and section formatting
  header(text: string): void {
    console.log('\n' + chalk.cyan.bold('═'.repeat(60)));
    console.log(chalk.cyan.bold(`  ${text}  `));
    console.log(chalk.cyan.bold('═'.repeat(60)));
  }

  subHeader(text: string): void {
    console.log('\n' + chalk.yellow.bold(`📋 ${text}`));
    console.log(chalk.yellow('─'.repeat(text.length + 4)));
  }

  info(text: string, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${chalk.blue('ℹ')} ${text}`);
  }

  success(text: string, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${chalk.green('✓')} ${text}`);
  }

  warning(text: string, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${chalk.yellow('⚠')} ${text}`);
  }

  error(text: string, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${chalk.red('✗')} ${text}`);
  }

  // Spinner management
  startSpinner(id: string, text: string): void {
    const spinner = ora(text).start();
    this.spinners.set(id, spinner);
  }

  updateSpinner(id: string, text: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = text;
    }
  }

  succeedSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.succeed(text);
      this.spinners.delete(id);
    }
  }

  failSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.fail(text);
      this.spinners.delete(id);
    }
  }

  stopAllSpinners(): void {
    for (const [id, spinner] of this.spinners) {
      spinner.stop();
      this.spinners.delete(id);
    }
  }

  // Configuration display
  displayConfiguration(models: ModelConfig[], questionsCount: number, pvsPath: string): void {
    this.subHeader('Benchmark Configuration');
    
    // Models table
    const modelsTable = new Table({
      head: [chalk.cyan('Provider'), chalk.cyan('Model'), chalk.cyan('Display Name')],
      colWidths: [12, 25, 25]
    });

    models.forEach(config => {
      modelsTable.push([
        chalk.blue(config.provider),
        chalk.white(config.model),
        chalk.gray(config.displayName)
      ]);
    });

    console.log(modelsTable.toString());
    
    this.info(`Questions: ${chalk.white(questionsCount)} tests`);
    this.info(`PVS File: ${chalk.white(pvsPath)}`);
  }

  // Progress display
  displayProgress(current: number, total: number, modelName: string, questionId: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(current, total);
    
    const progressText = `${current}/${total} (${percentage}%)`;
    console.log(`\n${progressBar} ${chalk.gray(progressText)}`);
    console.log(`${chalk.blue('►')} Testing ${chalk.yellow(modelName)} on question ${chalk.white(questionId)}`);
  }

  private createProgressBar(current: number, total: number, width: number = 20): string {
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  // Results display
  displayTestResult(result: BenchmarkResult, isBaseline: boolean): void {
    const status = result.error ? chalk.red('FAIL') : chalk.green('PASS');
    const type = isBaseline ? chalk.gray('baseline') : chalk.blue('with PVS');
    const time = chalk.gray(`${result.response_time_ms}ms`);
    
    console.log(`  ${status} ${type} ${time} ${result.error ? chalk.red(result.error) : ''}`);
  }

  // Summary display
  displaySummary(report: BenchmarkReport): void {
    this.header('Benchmark Results Summary');
    
    // Overview table
    const overviewTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
      colWidths: [20, 30]
    });

    overviewTable.push(
      ['Suite Name', chalk.white(report.suite_name)],
      ['PVS User', chalk.white(report.pvs_used)],
      ['Questions', chalk.white(report.total_questions.toString())],
      ['Models Tested', chalk.white(report.total_providers.toString())],
      ['Total Tests', chalk.white(report.results.length.toString())],
      ['Execution Time', chalk.white(`${(report.summary.execution_time_ms / 1000).toFixed(2)}s`)]
    );

    console.log(overviewTable.toString());

    // Results breakdown
    this.displayResultsBreakdown(report.results);

    // Errors if any
    const errors = report.results.filter(r => r.error);
    if (errors.length > 0) {
      this.displayErrors(errors);
    }
  }

  private displayResultsBreakdown(results: BenchmarkResult[]): void {
    this.subHeader('Results Breakdown');
    
    const resultsTable = new Table({
      head: [
        chalk.cyan('Provider'), 
        chalk.cyan('Model'), 
        chalk.cyan('Passed'),
        chalk.cyan('Failed'),
        chalk.cyan('Avg Time')
      ],
      colWidths: [12, 25, 10, 10, 12]
    });

    // Group results by provider and model
    const grouped: { [key: string]: BenchmarkResult[] } = {};
    results.forEach(result => {
      const key = `${result.provider}:${result.model}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(result);
    });

    Object.entries(grouped).forEach(([key, modelResults]) => {
      const [provider, model] = key.split(':');
      const passed = modelResults.filter(r => !r.error).length;
      const failed = modelResults.filter(r => r.error).length;
      const avgTime = Math.round(
        modelResults.reduce((sum, r) => sum + r.response_time_ms, 0) / modelResults.length
      );

      resultsTable.push([
        chalk.blue(provider),
        chalk.white(model),
        passed > 0 ? chalk.green(passed.toString()) : chalk.gray('0'),
        failed > 0 ? chalk.red(failed.toString()) : chalk.gray('0'),
        chalk.gray(`${avgTime}ms`)
      ]);
    });

    console.log(resultsTable.toString());
  }

  private displayErrors(errors: BenchmarkResult[]): void {
    this.subHeader(`Errors (${errors.length})`);
    
    errors.forEach((error, index) => {
      const errorNumber = `${index + 1}.`;
      console.log(`${chalk.red(errorNumber)} ${chalk.yellow(error.provider)}/${chalk.white(error.model)} - ${chalk.gray(error.question_id)}`);
      console.log(`   ${chalk.red('Error:')} ${error.error}`);
      if (index < errors.length - 1) console.log();
    });
  }

  // Available models display
  displayAvailableModels(modelsByProvider: { [provider: string]: ModelConfig[] }): void {
    this.header('Available Models');
    
    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      this.subHeader(`${provider.toUpperCase()} Models`);
      
      const providerTable = new Table({
        head: [chalk.cyan('Model ID'), chalk.cyan('Display Name')],
        colWidths: [30, 40]
      });

      models.forEach(model => {
        providerTable.push([
          chalk.white(model.model),
          chalk.gray(model.displayName)
        ]);
      });

      console.log(providerTable.toString());
    });
  }
}

export const logger = new ConsoleLogger();
