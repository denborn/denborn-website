/**
 * On Workers Builds, puts public/ back as the commit has it before anything
 * is built.
 *
 * Workers Builds restores a cached public/ over the fresh checkout (its build
 * cache keeps that folder, as it does for Gatsby sites). A file changed since
 * that cache was made then shipped in its old state, and a removed one came
 * back: in November 2026 the live site served the den's icons long after the
 * ball had replaced them (decision 209), with the den's frames that decision
 * 212 had removed.
 *
 *   node scripts/assets/restore-public.ts   on Workers Builds (WORKERS_CI set): restore; anywhere else: nothing
 *
 * Only public/ is restored, and Git's ignored files are kept: the sprites in
 * public/sprites/ are checked against their lock by sync-sprites.ts. Outside
 * Workers Builds nothing is touched, so a build never loses work that is not
 * committed yet. If Git fails, the build stops: no deploy beats a stale one.
 */
import { execFileSync } from 'node:child_process'
import { ROOT } from '../data/lib/pinned.ts'

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
}

if (process.env.WORKERS_CI) {
  const differences = git('status', '--porcelain', '--', 'public').trimEnd()
  if (differences) {
    console.log(`public/ is not as committed; putting it back:\n${differences}`)
    git('checkout', 'HEAD', '--', 'public')
    git('clean', '-fd', '--', 'public')
  }
}
