import { CsvHandler } from '../../utils/file/CsvHandler';
import { ParameterResolver } from '../../core/variables/ParameterResolver';
import { ResolveOptions } from '../../core/variables/types';

export class CsvDataProvider {
  static loadScenarios(csvPath: string): Record<string, Record<string, string>> {
    const rows = CsvHandler.read(csvPath);
    if (rows.length === 0) return {};

    const firstRowKeys = Object.keys(rows[0]);
    const fieldKey = firstRowKeys[0];
    const scenarioNames = firstRowKeys.filter((k) => k !== fieldKey);

    const scenarios: Record<string, Record<string, string>> = {};
    for (const name of scenarioNames) {
      scenarios[name] = {};
    }

    for (const row of rows) {
      const fieldName = row[fieldKey];
      if (!fieldName) continue;

      for (const name of scenarioNames) {
        scenarios[name][fieldName] = row[name] ?? '';
      }
    }

    return scenarios;
  }

  static loadResolvedScenarios(
    csvPath: string,
    options: ResolveOptions = {}
  ): Record<string, Record<string, string>> {
    const rawScenarios = this.loadScenarios(csvPath);
    const resolvedScenarios: Record<string, Record<string, string>> = {};

    for (const [scenarioName, scenarioData] of Object.entries(rawScenarios)) {
      resolvedScenarios[scenarioName] = ParameterResolver.resolveDeep(scenarioData, {
        ...options,
        dataContext: scenarioData
      });
    }

    return resolvedScenarios;
  }
}
