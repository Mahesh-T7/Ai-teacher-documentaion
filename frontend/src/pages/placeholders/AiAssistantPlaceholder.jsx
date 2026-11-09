import React from 'react';
import { Sparkles } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const AiAssistantPlaceholder = () => (
  <PlaceholderModule
    title="AI Teaching Assistant"
    subtitle="Generative pedagogical copilot for curriculum design, quiz generation, and differentiated lesson pacing."
    icon={Sparkles}
    phaseTag="Phase 2 AI Milestone"
    description="Intelligent AI assistant trained on state and national educational curricula. Helps educators instantly draft 5E instructional lesson plans, generate formative assessment question banks, craft bilingual explanations, and brainstorm engaging classroom experiments."
    features={[
      { title: 'Curriculum-Aligned 5E Plans', detail: 'Generate complete Engage, Explore, Explain, Elaborate, and Evaluate lesson plans in seconds.' },
      { title: 'Automated Quiz & Rubric Generator', detail: 'Instant Bloom’s Taxonomy categorized MCQs, short answers, and rubrics.' },
      { title: 'Bilingual Explanation Assistant', detail: 'Explain difficult scientific and mathematical concepts in regional and vernacular languages.' },
      { title: 'Remedial Learning Pathways', detail: 'Suggestions for slow learners and accelerated learners based on diagnostic outcomes.' },
    ]}
  />
);
