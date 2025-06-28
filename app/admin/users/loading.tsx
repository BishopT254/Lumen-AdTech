export default function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-primary border-gray-200"></div>
      <h3 className="text-lg font-medium">Loading users...</h3>
    </div>
  )
}
