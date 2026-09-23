import { expect, test } from "bun:test";
import { evaluatorFingerprint, provenanceMismatches, taskFingerprint } from "./provenance.ts";
import { BENCHMARK_TASKS } from "./tasks.ts";

test("comparison controls reject changed builds, budgets, permissions, evaluator, task and inputs",()=>{
  const p={blenderBuild:"5.2 build-a",evaluatorFingerprint:"eval-a",timeoutMinutes:30,bypassApprovals:false,
    taskFingerprints:{task:"t1",unrelated:"old"},referenceHashes:{task:{front:"f1",side:"s1"}}};
  expect(provenanceMismatches(p,p,["task"])).toEqual([]);
  for(const patch of [{blenderBuild:"build-b"},{timeoutMinutes:60},{bypassApprovals:true},{evaluatorFingerprint:"eval-b"},
    {taskFingerprints:{task:"t2"}},{referenceHashes:{task:{front:"changed",side:"s1"}}}])
    expect(provenanceMismatches(p,{...p,...patch},["task"]).length).toBeGreaterThan(0);
  expect(provenanceMismatches({}, {},["task"])).toHaveLength(5);
  expect(provenanceMismatches(p,{...p,taskFingerprints:{task:"t1",unrelated:"new"}},["task"])).toEqual([]);
});

test("task and evaluator fingerprints bind actual evaluator source and fixture content",async()=>{
  const task=BENCHMARK_TASKS[0];
  expect(taskFingerprint({...task,prompt:task.prompt+" changed"})).not.toBe(taskFingerprint(task));
  expect(await evaluatorFingerprint()).toMatch(/^[a-f0-9]{64}$/);
});
