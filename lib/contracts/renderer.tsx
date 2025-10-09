/**
 * PDF Renderer Service
 * 
 * Handles rendering React PDF templates to PDF buffers
 * Uses @react-pdf/renderer for Vercel-compatible PDF generation
 */

import { renderToBuffer } from '@react-pdf/renderer'
import { NdisServiceAgreementTemplate } from './templates/ndis-service-agreement-v1'
import type { NdisServiceAgreementV1Vars } from './schemas/ndis-service-agreement-v1'

export interface RenderPdfOptions {
  templateId: string
  version: string
  vars: any
}

export interface RenderPdfResult {
  success: boolean
  buffer?: Buffer
  renderMs?: number
  error?: string
}

/**
 * Render a contract PDF from template and variables
 */
export async function renderContractPdf(options: RenderPdfOptions): Promise<RenderPdfResult> {
  const startTime = Date.now()
  
  try {
    console.log(`[PDF RENDERER] Starting render for template: ${options.templateId} v${options.version}`)
    
    // Select template based on templateId and version
    let templateComponent
    
    if (options.templateId === 'ndis_service_agreement' && options.version === 'v1') {
      templateComponent = <NdisServiceAgreementTemplate vars={options.vars as NdisServiceAgreementV1Vars} />
    } else {
      return {
        success: false,
        error: `Unknown template: ${options.templateId} v${options.version}`
      }
    }
    
    // Render to buffer
    const buffer = await renderToBuffer(templateComponent)
    const renderMs = Date.now() - startTime
    
    console.log(`[PDF RENDERER] Render completed in ${renderMs}ms, size: ${buffer.length} bytes`)
    
    return {
      success: true,
      buffer: Buffer.from(buffer),
      renderMs
    }
    
  } catch (error) {
    const renderMs = Date.now() - startTime
    console.error(`[PDF RENDERER] Render failed after ${renderMs}ms:`, error)
    
    return {
      success: false,
      renderMs,
      error: error instanceof Error ? error.message : 'Unknown render error'
    }
  }
}

/**
 * Get available templates
 */
export function getAvailableTemplates() {
  return [
    {
      id: 'ndis_service_agreement',
      name: 'NDIS Service Agreement',
      version: 'v1',
      description: 'Standard service agreement for NDIS participants'
    }
  ]
}

