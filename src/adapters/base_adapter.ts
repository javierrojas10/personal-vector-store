import { PersonalVectorStore, LLMAdapter } from '../types';

export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract name: string;
  abstract readonly model: string;
  
  protected createSystemPrompt(pvs: PersonalVectorStore, additionalPrompt?: string): string {
    const { owner, identity, communication_style } = pvs;
    
    const locationText = owner.location ? ` based in ${owner.location}` : '';
    const contextPrompt = [
      `You are assisting ${owner.name}, who is ${owner.role || 'a professional'}${locationText}.`,
      ``,
      `IDENTITY & EXPERTISE:`,
      `${identity.bio}`,
      `Skills: ${identity.skills.join(', ')}`,
      `Interests: ${identity.interests.join(', ')}`,
      identity.expertise_areas && `Areas of expertise: ${identity.expertise_areas.join(', ')}`,
      identity.achievements && `Key achievements: ${identity.achievements.join(', ')}`,
      ``,
      `COMMUNICATION STYLE:`,
      `- Tone: ${communication_style.tone}`,
      `- Languages: ${communication_style.languages.join(', ')}`,
      `- Answer style: ${communication_style.preferences.answers}`,
      `- Code style: ${communication_style.preferences.code}`,
      `- Explanation style: ${communication_style.preferences.explanations}`,
      ``,
      `Please respond in a way that aligns with this person's identity, expertise, and communication preferences.`
    ].filter(Boolean).join('\n');

    if (additionalPrompt) {
      return contextPrompt + '\n\nADDITIONAL INSTRUCTIONS:\n' + additionalPrompt;
    }
    return contextPrompt;
  }

  abstract inject(pvs: PersonalVectorStore, systemPrompt?: string): Promise<string>;
  abstract query(prompt: string, context: string): Promise<string>;
}
