'use client';

import InputFormGroup from '@/components/ui/InputFormGroup';
import Button from '@/components/ui/Button';
import { useState } from 'react';

interface ProposalEditorProps {
  onSubmit: (data: { title: string; tldr: string; content: string }) => void;
  isLoading?: boolean;
}

export default function ProposalEditor({ onSubmit, isLoading = false }: ProposalEditorProps) {
  const [title, setTitle] = useState('');
  const [tldr, setTldr] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (title.length > 128) errs.title = 'Title must be under 128 characters';
    if (!tldr.trim()) errs.tldr = 'TLDR is required';
    if (tldr.length > 256) errs.tldr = 'TLDR must be under 256 characters';
    if (!content.trim()) errs.content = 'Proposal body is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      tldr: tldr.trim(),
      content: content.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-2xl">
      <InputFormGroup
        label="Title"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give your proposal a clear title"
        error={errors.title}
        required
      />

      <InputFormGroup
        label="TL;DR"
        name="tldr"
        value={tldr}
        onChange={(e) => setTldr(e.target.value)}
        placeholder="Summarize your proposal in one sentence"
        error={errors.tldr}
        required
      />

      <InputFormGroup
        label="Proposal Body"
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Describe your proposal in detail..."
        error={errors.content}
        required
        textarea
        rows={10}
      />

      <div className="flex justify-end mt-2">
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Proposal'}
        </Button>
      </div>
    </form>
  );
}
