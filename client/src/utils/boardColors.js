const boardColorSchemes = [
  { bg: 'bg-aikit-400', gradient: 'bg-gradient-to-br from-aikit-400 to-aikit-700' },
  { bg: 'bg-aikit-700', gradient: 'bg-gradient-to-br from-aikit-700 to-aikit-900' },
  { bg: 'bg-aikit-800', gradient: 'bg-gradient-to-br from-aikit-800 to-[#0F0F0F]' },
  { bg: 'bg-aikit-500', gradient: 'bg-gradient-to-br from-aikit-500 to-aikit-800' },
  { bg: 'bg-aikit-600', gradient: 'bg-gradient-to-br from-aikit-600 to-aikit-900' },
  { bg: 'bg-[#111936]', gradient: 'bg-gradient-to-br from-[#111936] to-[#0F0F0F]' },
  { bg: 'bg-aikit-300', gradient: 'bg-gradient-to-br from-aikit-300 to-aikit-600' },
  { bg: 'bg-[#18319A]', gradient: 'bg-gradient-to-br from-[#18319A] to-[#111936]' },
]

export function getBoardColor(boardId) {
  const hash = boardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return boardColorSchemes[hash % boardColorSchemes.length]
}
