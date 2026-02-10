declare module 'diff-match-patch' {
  type Diff = [number, string];

  class diff_match_patch {
    diff_main(text1: string, text2: string): Diff[];
    diff_cleanupSemantic(diffs: Diff[]): void;
  }

  export default diff_match_patch;
}
