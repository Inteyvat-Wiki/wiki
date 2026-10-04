import assert from 'node:assert/strict';
import type { TaskNumberCondition, TaskComparison } from '../app/types/travel_log';
import { create_number_intervals, format_number_interval, matches_number_condition } from '../app/utils/task_condition';

function condition(value: number, comparison: TaskComparison = 'equal'): TaskNumberCondition {
    return { type: 'number', id: 'number', title: '', subtitle: '', value, comparison };
}

function labels(conditions: TaskNumberCondition[]) {
    return create_number_intervals(conditions).map(interval => format_number_interval(interval, 'Other'));
}

assert.deepEqual(labels([condition(3)]), ['3', 'Other']);
assert.deepEqual(labels([condition(1), condition(3)]), ['1', '3', 'Other']);
assert.deepEqual(labels([condition(3, 'greater_equal')]), ['[3, +∞)', 'Other']);
assert.deepEqual(labels([condition(3, 'not_equal')]), ['(-∞, 3)', '(3, +∞)', 'Other']);
assert.deepEqual(labels([condition(3, 'less_equal'), condition(3, 'greater_equal')]),
    ['(-∞, 3)', '3', '(3, +∞)']);
assert.deepEqual(create_number_intervals([]), []);
assert.equal(create_number_intervals([condition(3)]).find(interval => 'other' in interval)?.sample, 0);
assert.equal(create_number_intervals([condition(0)]).find(interval => !('other' in interval))?.sample, 0);

const comparisons: TaskComparison[] = ['equal', 'not_equal', 'greater', 'greater_equal', 'less', 'less_equal'];
for (const left of comparisons) for (const right of comparisons) {
    const conditions = [condition(-2, left), condition(3, right)];
    const intervals = create_number_intervals(conditions);
    const other = intervals.filter(interval => 'other' in interval);
    assert(other.length <= 1);
    const signature = (value: number) => conditions.map(item => matches_number_condition(item, value));
    for (let value = -6; value <= 6; value += 0.5) {
        const expected = signature(value);
        const range = intervals.find(interval => !('other' in interval)
            && (interval.lower === null || value > interval.lower || interval.lower_closed && value === interval.lower)
            && (interval.upper === null || value < interval.upper || interval.upper_closed && value === interval.upper));
        if (expected.some(Boolean)) {
            assert(range, `Missing covered value ${value}: ${left}/${right}`);
            assert.deepEqual(signature(range.sample), expected);
        } else {
            assert.equal(range, undefined);
            assert.equal(other.length, 1);
            assert.deepEqual(signature(other[0]!.sample), expected);
        }
    }
    assert(intervals.some(interval => interval.sample === 0));
}

console.log('task condition interval tests passed');
