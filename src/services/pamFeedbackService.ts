/**
 * PAM Feedback & Issue Reporting Service
 * Allows users to report bugs, issues, and suggestions via PAM conversation
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PamFeedback {
  type: "bug" | "suggestion" | "issue" | "complaint" | "feature_request";
  category: "voice" | "calendar" | "maps" | "ui" | "performance" | "general";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  userContext?: {
    page?: string;
    action?: string;
    device?: string;
    browser?: string;
  };
  metadata?: Record<string, any>;
}

export interface ParsedFeedback {
  type: "bug" | "suggestion" | "issue" | "complaint" | "feature_request";
  category: "voice" | "calendar" | "maps" | "ui" | "performance" | "general";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  userMessage: string;
  timestamp: Date;
}

class PamFeedbackService {
  /**
   * Detect if user message contains feedback/issue keywords
   */
  public detectFeedbackIntent(message: string): boolean {
    const feedbackKeywords = [
      // Direct feedback words
      "bug", "issue", "problem", "error", "broken", "not working", "doesn't work",
      "suggest", "suggestion", "improve", "feature", "add", "wish", "could",
      "feedback", "report", "complaint", "complain",
      
      // Problem indicators
      "can't", "cannot", "unable", "failed", "fails", "wrong", "incorrect",
      "missing", "disappeared", "frozen", "stuck", "slow", "laggy",
      
      // Emotional indicators
      "frustrated", "annoying", "difficult", "confusing", "hate", "love",
      "terrible", "awful", "great", "amazing", "perfect", "terrible"
    ];

    const lowerMessage = message.toLowerCase();
    return feedbackKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Parse feedback type from user message
   */
  private parseFeedbackType(message: string): "bug" | "suggestion" | "issue" | "complaint" | "feature_request" {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("bug") || lowerMessage.includes("error") || lowerMessage.includes("broken")) {
      return "bug";
    }
    
    if (lowerMessage.includes("suggest") || lowerMessage.includes("wish") || lowerMessage.includes("could") || lowerMessage.includes("feature")) {
      return "feature_request";
    }
    
    if (lowerMessage.includes("complain") || lowerMessage.includes("hate") || lowerMessage.includes("terrible") || lowerMessage.includes("awful")) {
      return "complaint";
    }
    
    if (lowerMessage.includes("improve") || lowerMessage.includes("better") || lowerMessage.includes("suggestion")) {
      return "suggestion";
    }
    
    return "issue";
  }

  /**
   * Parse feedback category from user message
   */
  private parseFeedbackCategory(message: string): "voice" | "calendar" | "maps" | "ui" | "performance" | "general" {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("voice") || lowerMessage.includes("speak") || lowerMessage.includes("talk") || lowerMessage.includes("hear")) {
      return "voice";
    }
    
    if (lowerMessage.includes("calendar") || lowerMessage.includes("appointment") || lowerMessage.includes("event") || lowerMessage.includes("schedule")) {
      return "calendar";
    }
    
    if (lowerMessage.includes("map") || lowerMessage.includes("route") || lowerMessage.includes("location") || lowerMessage.includes("gps")) {
      return "maps";
    }
    
    if (lowerMessage.includes("slow") || lowerMessage.includes("fast") || lowerMessage.includes("lag") || lowerMessage.includes("performance")) {
      return "performance";
    }
    
    if (lowerMessage.includes("button") || lowerMessage.includes("click") || lowerMessage.includes("screen") || lowerMessage.includes("display")) {
      return "ui";
    }
    
    return "general";
  }

  /**
   * Parse feedback severity from user message
   */
  private parseFeedbackSeverity(message: string): "low" | "medium" | "high" | "critical" {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("critical") || lowerMessage.includes("urgent") || lowerMessage.includes("immediately")) {
      return "critical";
    }
    
    if (lowerMessage.includes("important") || lowerMessage.includes("serious") || lowerMessage.includes("major")) {
      return "high";
    }
    
    if (lowerMessage.includes("minor") || lowerMessage.includes("small") || lowerMessage.includes("little")) {
      return "low";
    }
    
    return "medium";
  }

  /**
   * Extract feedback title from message
   */
  private extractFeedbackTitle(message: string, type: string): string {
    // Remove common starting phrases
    let title = message
      .replace(/^(i have a|there is a|i found a|i want to report a|can you fix|please fix)/i, "")
      .replace(/^(pam,?|hey pam,?|hi pam,?)/i, "")
      .trim();

    // Truncate to reasonable length
    if (title.length > 80) {
      title = `${title.substring(0, 77)  }...`;
    }

    // Add type prefix if not clear
    if (!title.toLowerCase().includes(type)) {
      title = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${title}`;
    }

    return title || `${type.charAt(0).toUpperCase() + type.slice(1)} report`;
  }

  /**
   * Get current user context for feedback
   */
  private getCurrentUserContext() {
    return {
      page: window.location.pathname,
      action: "PAM conversation",
      device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? "mobile" : "desktop",
      browser: navigator.userAgent.split(" ").find(part => part.includes("Chrome") || part.includes("Firefox") || part.includes("Safari")) || "unknown"
    };
  }

  /**
   * Parse user message into structured feedback
   */
  public parseFeedbackFromMessage(message: string): ParsedFeedback {
    const type = this.parseFeedbackType(message);
    const category = this.parseFeedbackCategory(message);
    const severity = this.parseFeedbackSeverity(message);
    const title = this.extractFeedbackTitle(message, type);

    return {
      type,
      category,
      severity,
      title,
      description: message,
      userMessage: message,
      timestamp: new Date()
    };
  }

  /**
   * Submit feedback to database
   */
  public async submitFeedback(feedback: ParsedFeedback): Promise<{ success: boolean; message: string; feedbackId?: string }> {
    console.log('🔧 PAM Feedback Service: Submitting feedback:', feedback);
    
    try {
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔧 Auth check:', { user: !!user, error: userError });
      
      if (userError || !user) {
        // For anonymous feedback, we'll create a guest submission
        console.log('🔧 Anonymous feedback submission');
      }

      // Prepare database payload
      const payload = {
        type: feedback.type,
        category: feedback.category,
        severity: feedback.severity,
        title: feedback.title,
        description: feedback.description,
        user_message: feedback.userMessage,
        user_id: user?.id || null,
        user_email: user?.email || null,
        user_context: this.getCurrentUserContext(),
        metadata: {
          timestamp: feedback.timestamp.toISOString(),
          source: "pam_conversation",
          session_id: Date.now().toString()
        },
        status: "new",
        created_at: new Date().toISOString()
      };
      
      console.log('🔧 Database payload:', payload);

      // Insert into database
      const { data: insertedFeedback, error } = await supabase
        .from("user_feedback")
        .insert([payload])
        .select()
        .single();

      console.log('🔧 Database insert result:', { data: insertedFeedback, error });

      if (error) {
        console.error("❌ Database insert error:", error);
        return { success: false, message: `Failed to submit feedback: ${error.message}` };
      }

      // Show success notification
      toast.success(`📝 Thank you! Your ${feedback.type} report has been submitted for review.`);

      console.log('✅ Feedback submitted successfully:', insertedFeedback);
      return { 
        success: true, 
        message: `Thank you! I've recorded your ${feedback.type} report. Our team will review it and work on improvements.`,
        feedbackId: insertedFeedback.id
      };

    } catch (error) {
      console.error("❌ Error submitting feedback:", error);
      return { success: false, message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Process feedback from PAM conversation
   */
  public async processFeedbackFromConversation(userMessage: string, pamResponse: string): Promise<{ feedbackProcessed: boolean; response?: string }> {
    console.log('🔧 PAM Feedback: Checking message for feedback intent:', userMessage);
    
    if (!this.detectFeedbackIntent(userMessage)) {
      return { feedbackProcessed: false };
    }

    console.log('🔧 PAM Feedback: Feedback intent detected, processing...');
    
    // Parse the feedback
    const parsedFeedback = this.parseFeedbackFromMessage(userMessage);
    console.log('🔧 Parsed feedback:', parsedFeedback);

    // Submit to database
    const result = await this.submitFeedback(parsedFeedback);
    
    if (result.success) {
      // Generate appropriate response
      const responses = {
        bug: "I've logged that bug report for our development team. They'll investigate and work on a fix. Thank you for helping us improve!",
        issue: "I've recorded the issue you're experiencing. Our team will look into it and work on a solution. Thanks for letting us know!",
        suggestion: "Great suggestion! I've passed it along to our product team for consideration. We appreciate your input on how to make Wheels & Wins better!",
        complaint: "I'm sorry you're having a frustrating experience. I've documented your concerns for our team to address. We'll work on improving this area.",
        feature_request: "Excellent feature idea! I've submitted your request to our development team for review. Innovation often comes from user suggestions like yours!"
      };

      return {
        feedbackProcessed: true,
        response: `${responses[parsedFeedback.type]  } (Feedback ID: ${result.feedbackId?.substring(0, 8)})`
      };
    } else {
      return {
        feedbackProcessed: true,
        response: "I tried to record your feedback but encountered a technical issue. Please try again, or you can contact support directly if the problem persists."
      };
    }
  }
}

// Export singleton instance
export const pamFeedbackService = new PamFeedbackService();

// Global function to make it accessible from PAM
(window as any).submitPamFeedback = async (feedbackData: PamFeedback) => {
  const parsed = pamFeedbackService.parseFeedbackFromMessage(feedbackData.description);
  return await pamFeedbackService.submitFeedback(parsed);
};