export type AssessmentType = 'Finance' | 'Marketing' | 'Operations' | 'AIReadiness';
export type AssessmentStatus = 'InProgress' | 'Completed';
export type QuestionType = 'MultipleChoice' | 'Rating' | 'Scale' | 'YesNo' | 'Text' | 'Numeric';
export type MaturityLevel = 'AdHoc' | 'Repeatable' | 'Defined' | 'Managed' | 'Optimized';
export type AssessmentRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RecommendationPriority = 'Low' | 'Medium' | 'High' | 'Immediate';
export type RecommendationStatus = 'Open' | 'InProgress' | 'Completed' | 'Deferred';

export const RECOMMENDATION_STATUSES: RecommendationStatus[] = ['Open', 'InProgress', 'Completed', 'Deferred'];

export function levelLabel(level: MaturityLevel | null | undefined): string {
  return level === 'AdHoc' ? 'Ad-hoc' : (level ?? '—');
}

export function isOptionQuestion(type: QuestionType): boolean {
  return type === 'MultipleChoice' || type === 'Rating' || type === 'Scale' || type === 'YesNo';
}

export interface AssessmentTemplateSummary {
  id: string; code: string; name: string; description: string; type: AssessmentType;
  sectionCount: number; questionCount: number;
}

export interface QuestionOption { id: string; code: string; text: string; }
export interface AssessmentQuestion {
  id: string; code: string; text: string; guidance: string; type: QuestionType; isMandatory: boolean; options: QuestionOption[];
}
export interface AssessmentSection { id: string; code: string; name: string; description: string; questions: AssessmentQuestion[]; }

export interface SavedAnswer {
  questionId: string; selectedOptionId?: string | null; textResponse?: string | null; numericResponse?: number | null; notes?: string | null;
}

export interface ClientAssessment {
  id: string; code: string; clientId: string; templateId: string; templateName: string; type: AssessmentType;
  status: AssessmentStatus; startedAt: string; completedAt: string | null;
  answeredQuestions: number; totalQuestions: number; progressPercentage: number;
  overallScore: number | null; level: MaturityLevel | null;
}
export interface AssessmentDetail extends ClientAssessment { sections: AssessmentSection[]; answers: SavedAnswer[]; }

export interface SaveAnswersResult { saved: number; answeredQuestions: number; totalQuestions: number; progressPercentage: number; }

export interface SectionScore {
  sectionId: string; sectionName: string; score: number; level: MaturityLevel; weight: number; answeredQuestions: number; totalQuestions: number;
}
export interface AssessmentGap {
  id: string; sectionName: string; area: string; description: string; riskLevel: AssessmentRiskLevel; gapPoints: number;
}
export interface AssessmentRecommendation {
  id: string; gapId: string; title: string; description: string; priority: RecommendationPriority; status: RecommendationStatus;
  estimatedEffort: string; expectedBenefit: string; area: AssessmentType;
}
export interface TrendPoint { assessmentId: string; completedAt: string; score: number; level: MaturityLevel; }
export interface AssessmentReport {
  assessmentId: string; code: string; clientName: string; templateName: string; type: AssessmentType; completedAt: string;
  overallScore: number; level: MaturityLevel; executiveSummary: string; criticalGaps: number; highGaps: number;
  sections: SectionScore[]; gaps: AssessmentGap[]; recommendations: AssessmentRecommendation[]; trend: TrendPoint[];
}
