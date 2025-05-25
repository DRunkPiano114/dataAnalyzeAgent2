import { TextareaHTMLAttributes } from "react"

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="border p-2 rounded w-full"
      rows={4}
      {...props}
    />
  )
}