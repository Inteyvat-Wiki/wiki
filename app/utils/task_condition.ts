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

type NumberRange = {
    lower: number | null,
    lower_closed: boolean,
    upper: number | null,
    upper_closed: boolean,
    sample: number,
};

export type TaskNumberInterval = NumberRange | { other: true, sample: number };

export function create_number_intervals(conditions: TaskNumberCondition[]): TaskNumberInterval[] {
    const thresholds = [...new Set(conditions.map(condition => condition.value))]
        .sort((left, right) => left - right);
    if (thresholds.length === 0) return [];

    const atoms: NumberRange[] = [{
        lower: null,
        lower_closed: false,
        upper: thresholds[0]!,
        upper_closed: false,
        sample: thresholds[0]! - 1,
    }];
    for (let index = 0; index < thresholds.length; index++) {
        const threshold = thresholds[index]!;
        atoms.push({
            lower: threshold,
            lower_closed: true,
            upper: threshold,
            upper_closed: true,
            sample: threshold,
        });
        const next = thresholds[index + 1];
        if (next !== undefined) atoms.push({
            lower: threshold,
            lower_closed: false,
            upper: next,
            upper_closed: false,
            sample: (threshold + next) / 2,
        });
    }
    atoms.push({
        lower: thresholds.at(-1)!,
        lower_closed: false,
        upper: null,
        upper_closed: false,
        sample: thresholds.at(-1)! + 1,
    });

    const result: (NumberRange & { signature: string })[] = [];
    let other: Extract<TaskNumberInterval, { other: true }> | undefined;
    for (const atom of atoms) {
        const signature = conditions
            .map(condition => matches_number_condition(condition, atom.sample) ? '1' : '0')
            .join('');
        const sample = contains_number(atom, 0) ? 0 : atom.sample;
        // 所有条件均不成立的范围可以不连续，统一用一个代表值参与条件计算。
        if (!signature.includes('1')) {
            other ??= { other: true, sample };
            if (sample === 0) other.sample = 0;
            continue;
        }
        const previous = result.at(-1);
        if (previous?.signature === signature && previous.upper === atom.lower
            && (previous.upper_closed || atom.lower_closed)) {
            previous.upper = atom.upper;
            previous.upper_closed = atom.upper_closed;
            if (sample === 0) previous.sample = 0;
        } else {
            result.push({ ...atom, sample, signature });
        }
    }
    return [...result.map(({ signature: _, ...interval }) => interval), ...(other ? [other] : [])];
}

function contains_number(interval: NumberRange, value: number) {
    const above_lower = interval.lower === null
        || value > interval.lower
        || interval.lower_closed && value === interval.lower;
    const below_upper = interval.upper === null
        || value < interval.upper
        || interval.upper_closed && value === interval.upper;
    return above_lower && below_upper;
}

export function format_number_interval(interval: TaskNumberInterval, other_label: string) {
    if ('other' in interval) return other_label;
    if (interval.lower === interval.upper && interval.lower_closed && interval.upper_closed) {
        return String(interval.lower);
    }
    const left = interval.lower_closed ? '[' : '(';
    const right = interval.upper_closed ? ']' : ')';
    return `${left}${interval.lower ?? '-∞'}, ${interval.upper ?? '+∞'}${right}`;
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
