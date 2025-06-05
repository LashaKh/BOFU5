import { supabase } from './supabase';
import { diffLines, diffWords, createPatch } from 'diff';
import {
  VersionHistory,
  VersionComparison,
  VersionHistoryResult,
  VersionCreateResult,
  VersionRestoreResult,
  VersionStatsResult,
  BulkVersionOperation,
  BulkVersionResult,
  RestoreWithBackupResult,
  VersionAnnotationResult,
  DiffType,
  VersionTag,
  VersionMetadata
} from '../types/versionHistory';

/**
 * Create a new version history entry
 */
export async function createVersionHistory(
  articleId: string,
  content: string,
  metadata: Record<string, any> = {},
  changeSummary?: string,
  versionTag: VersionTag = 'manual_save'
): Promise<VersionCreateResult> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Call the database function to create version history
    const { data, error } = await supabase.rpc('create_version_history', {
      p_article_id: articleId,
      p_content: content,
      p_metadata: metadata,
      p_change_summary: changeSummary,
      p_version_tag: versionTag
    });

    if (error) {
      console.error('Error creating version history:', error);
      return {
        success: false,
        error: `Failed to create version: ${error.message}`
      };
    }

    // Fetch the created version
    const { data: versionData, error: fetchError } = await supabase
      .from('version_history')
      .select(`
        id,
        article_id,
        version_number,
        content,
        metadata,
        created_at,
        created_by,
        change_summary,
        version_tag
      `)
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('Error fetching created version:', fetchError);
      return {
        success: false,
        error: 'Version created but failed to fetch details'
      };
    }

    return {
      success: true,
      data: {
        id: versionData.id,
        article_id: versionData.article_id,
        version_number: versionData.version_number,
        content: versionData.content,
        metadata: versionData.metadata || {},
        created_at: versionData.created_at,
        created_by: versionData.created_by,
        change_summary: versionData.change_summary,
        version_tag: versionData.version_tag as VersionTag
      }
    };

  } catch (error) {
    console.error('Unexpected error creating version history:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while creating version'
    };
  }
}

/**
 * Get version history for an article
 */
export async function getVersionHistory(articleId: string): Promise<VersionHistoryResult> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Use the database function to get version history
    const { data, error } = await supabase.rpc('get_article_version_history', {
      p_article_id: articleId
    });

    if (error) {
      console.error('Error fetching version history:', error);
      return {
        success: false,
        error: `Failed to fetch version history: ${error.message}`
      };
    }

    const versions: VersionHistory[] = (data || []).map((version: any) => ({
      id: version.id,
      article_id: articleId,
      version_number: version.version_number,
      content: '', // Content not returned in list view for performance
      metadata: version.metadata || {},
      created_at: version.created_at,
      created_by: version.created_by,
      change_summary: version.change_summary,
      version_tag: version.version_tag as VersionTag,
      user_email: version.user_email
    }));

    return {
      success: true,
      data: versions
    };

  } catch (error) {
    console.error('Unexpected error fetching version history:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while fetching version history'
    };
  }
}

/**
 * Get a specific version with full content
 */
export async function getVersion(articleId: string, versionNumber: number): Promise<VersionCreateResult> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Fetch the specific version
    const { data, error } = await supabase
      .from('version_history')
      .select(`
        id,
        article_id,
        version_number,
        content,
        metadata,
        created_at,
        created_by,
        change_summary,
        version_tag
      `)
      .eq('article_id', articleId)
      .eq('version_number', versionNumber)
      .single();

    if (error) {
      console.error('Error fetching version:', error);
      return {
        success: false,
        error: `Failed to fetch version: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Version not found'
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        article_id: data.article_id,
        version_number: data.version_number,
        content: data.content,
        metadata: data.metadata || {},
        created_at: data.created_at,
        created_by: data.created_by,
        change_summary: data.change_summary,
        version_tag: data.version_tag as VersionTag
      }
    };

  } catch (error) {
    console.error('Unexpected error fetching version:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while fetching version'
    };
  }
}

/**
 * Enhanced version comparison with multiple diff types
 */
export async function compareVersionsAdvanced(
  articleId: string,
  version1Number: number,
  version2Number: number,
  diffType: DiffType = 'lines'
): Promise<{ success: boolean; data?: VersionComparison & { patchData?: string }; error?: string }> {
  try {
    // Fetch both versions
    const [version1Result, version2Result] = await Promise.all([
      getVersion(articleId, version1Number),
      getVersion(articleId, version2Number)
    ]);

    if (!version1Result.success || !version1Result.data) {
      return {
        success: false,
        error: `Failed to fetch version ${version1Number}: ${version1Result.error}`
      };
    }

    if (!version2Result.success || !version2Result.data) {
      return {
        success: false,
        error: `Failed to fetch version ${version2Number}: ${version2Result.error}`
      };
    }

    const version1 = version1Result.data;
    const version2 = version2Result.data;

    // Generate diff based on type
    let diff: string;
    let patchData: string | undefined;

    switch (diffType) {
      case 'words':
        diff = generateWordDiff(version1.content, version2.content);
        break;
      case 'characters':
        diff = generateCharacterDiff(version1.content, version2.content);
        break;
      default:
        diff = generateLineDiff(version1.content, version2.content);
        break;
    }

    // Generate patch data for advanced diff tools
    patchData = createPatch(
      `version_${version1Number}`,
      version1.content,
      version2.content,
      `Version ${version1Number}`,
      `Version ${version2Number}`
    );

    return {
      success: true,
      data: {
        version1,
        version2,
        diff,
        patchData
      }
    };

  } catch (error) {
    console.error('Unexpected error comparing versions:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while comparing versions'
    };
  }
}

/**
 * Compare two versions and return the diff (backward compatibility)
 */
export async function compareVersions(
  articleId: string,
  version1Number: number,
  version2Number: number
): Promise<{ success: boolean; data?: VersionComparison; error?: string }> {
  const result = await compareVersionsAdvanced(articleId, version1Number, version2Number, 'lines');
  
  if (!result.success || !result.data) {
    return {
      success: result.success,
      error: result.error
    };
  }

  // Return without patchData for backward compatibility
  const { patchData, ...data } = result.data;
  return {
    success: true,
    data
  };
}

/**
 * Restore a previous version (creates a new version with old content)
 */
export async function restoreVersion(
  articleId: string,
  versionNumber: number,
  changeSummary?: string
): Promise<VersionRestoreResult> {
  try {
    // Get the version to restore
    const versionResult = await getVersion(articleId, versionNumber);
    if (!versionResult.success || !versionResult.data) {
      return {
        success: false,
        error: `Failed to fetch version ${versionNumber}: ${versionResult.error}`
      };
    }

    const versionToRestore = versionResult.data;

    // Update the article with the restored content
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Update the content_briefs table with restored content
    const { error: updateError } = await supabase
      .from('content_briefs')
      .update({
        article_content: versionToRestore.content,
        last_edited_at: new Date().toISOString(),
        last_edited_by: user.id
      })
      .eq('id', articleId)
      .eq('user_id', user.id); // Ensure user can only update their own articles

    if (updateError) {
      console.error('Error updating article content:', updateError);
      return {
        success: false,
        error: `Failed to restore article: ${updateError.message}`
      };
    }

    // The trigger will automatically create a new version with 'restored' tag
    // Get the new version number
    const historyResult = await getVersionHistory(articleId);
    if (!historyResult.success || !historyResult.data || historyResult.data.length === 0) {
      return {
        success: false,
        error: 'Article restored but failed to verify new version'
      };
    }

    const newVersionNumber = historyResult.data[0].version_number;

    return {
      success: true,
      data: {
        restored_version: versionNumber,
        new_version: newVersionNumber
      }
    };

  } catch (error) {
    console.error('Unexpected error restoring version:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while restoring version'
    };
  }
}

/**
 * Generate line-based diff using diff library
 */
function generateLineDiff(oldText: string, newText: string): string {
  const diff = diffLines(oldText, newText);
  let diffHtml = '<div class="diff-container line-diff">';
  
  diff.forEach((part) => {
    const lines = part.value.split('\n').filter(line => line !== '');
    const className = part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-unchanged';
    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
    
    lines.forEach(line => {
      diffHtml += `<div class="diff-line ${className}">${prefix}${escapeHtml(line)}</div>`;
    });
  });
  
  diffHtml += '</div>';
  return diffHtml;
}

/**
 * Generate word-based diff using diff library
 */
function generateWordDiff(oldText: string, newText: string): string {
  const diff = diffWords(oldText, newText);
  let diffHtml = '<div class="diff-container word-diff">';
  
  diff.forEach((part) => {
    const className = part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-unchanged';
    diffHtml += `<span class="${className}">${escapeHtml(part.value)}</span>`;
  });
  
  diffHtml += '</div>';
  return diffHtml;
}

/**
 * Generate character-based diff
 */
function generateCharacterDiff(oldText: string, newText: string): string {
  // Simple character-by-character comparison
  let diffHtml = '<div class="diff-container char-diff">';
  const maxLength = Math.max(oldText.length, newText.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldChar = oldText[i] || '';
    const newChar = newText[i] || '';
    
    if (oldChar === newChar) {
      diffHtml += `<span class="diff-unchanged">${escapeHtml(oldChar)}</span>`;
    } else if (oldChar && !newChar) {
      diffHtml += `<span class="diff-removed">${escapeHtml(oldChar)}</span>`;
    } else if (!oldChar && newChar) {
      diffHtml += `<span class="diff-added">${escapeHtml(newChar)}</span>`;
    } else {
      diffHtml += `<span class="diff-removed">${escapeHtml(oldChar)}</span>`;
      diffHtml += `<span class="diff-added">${escapeHtml(newChar)}</span>`;
    }
  }
  
  diffHtml += '</div>';
  return diffHtml;
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add annotation to a version
 */
export async function addVersionAnnotation(
  versionId: string,
  annotation: string
): Promise<VersionAnnotationResult> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Update the version with annotation
    const { error } = await supabase
      .from('version_history')
      .update({
        change_summary: annotation
      })
      .eq('id', versionId)
      .eq('created_by', user.id); // Ensure user can only annotate their own versions

    if (error) {
      console.error('Error adding version annotation:', error);
      return {
        success: false,
        error: `Failed to add annotation: ${error.message}`
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Unexpected error adding annotation:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while adding annotation'
    };
  }
} 