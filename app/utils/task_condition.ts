import type {
    TaskCondition,
    TaskConditionToken,
    TaskNumberCondition,
    TaskState,
    TaskStepCondition,
} from '~/types/travel_log';

type ConditionResult = boolean | undefined;

export type TaskConditionValues = Record<string, TaskState | number | boolean | undefined>;

export function is_step_condition(condition: TaskCondition): condition is TaskStepCondition {
    return condition.type === 'step';
}

export function is_number_condition(condition: TaskCondition): condition is TaskNumberCondition {
    return condition.type === 'number';
}

export function matches_number_condition(condition: TaskNumberCondition, value: number): boolean {
    if (condition.comparison === 'equal') return value === condition.value;
    if (condition.comparison === 'not_equal') return value !== condition.value;
    if (condition.comparison === 'greater') return value > condition.value;
    if (condition.comparison === 'greater_equal') return value >= condition.value;
    if (condition.comparison === 'less') return value < condition.value;
    return value <= condition.value;
}

function evaluate_and(left: ConditionResult, right: ConditionResult): ConditionResult {
    if (left === false || right === false) return false;
    if (left === undefined || right === undefined) return undefined;
    return true;
}

function evaluate_or(left: ConditionResult, right: ConditionResult): ConditionResult {
    if (left === true || right === true) return true;
    if (left === undefined || right === undefined) return undefined;
    return false;
}

function evaluate_step_condition(
    condition: TaskStepCondition,
    current_step: number,
    steps: number[],
    values: TaskConditionValues,
): ConditionResult {
    const expected_state = condition.state || 'ongoing';
    if (condition.task) {
        const state = values[condition.id];
        return state === undefined ? undefined : state === expected_state;
    }

    const current_index = steps.indexOf(current_step);
    const condition_index = steps.indexOf(condition.step);
    if (current_index < 0 || condition_index < 0) return false;

    const state: TaskState = condition_index < current_index
        ? 'finished'
        : condition_index === current_index ? 'ongoing' : 'unstarted';
    return state === expected_state;
}

function evaluate_value_condition(
    condition: Exclude<TaskCondition, TaskStepCondition>,
    values: TaskConditionValues,
): ConditionResult {
    const selected = values[condition.id];
    if (selected === undefined) return undefined;
    if (condition.type === 'boolean') return selected === condition.value;

    const value = Number(selected);
    return Number.isFinite(value) ? matches_number_condition(condition, value) : undefined;
}

export function evaluate_task_conditions(
    tokens: TaskConditionToken[],
    current_step: number,
    steps: number[],
    values: TaskConditionValues,
): ConditionResult {
    if (tokens.length === 0) return false;

    const stack: ConditionResult[] = [];
    for (const token of tokens) {
        if (typeof token !== 'string') {
            stack.push(is_step_condition(token)
                ? evaluate_step_condition(token, current_step, steps, values)
                : evaluate_value_condition(token, values));
            continue;
        }

        if (token === 'not') {
            const value = stack.pop();
            stack.push(value === undefined ? undefined : !value);
            continue;
        }

        const right = stack.pop();
        const left = stack.pop();
        stack.push(token === 'and' ? evaluate_and(left, right) : evaluate_or(left, right));
    }
    return stack.length === 1 ? stack[0] : false;
}
