/**
 * NDIS Service Agreement Template v1
 * 
 * A professional 3-page contract template for NDIS service agreements
 * Includes provider details, participant info, service terms, and transaction history
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { NdisServiceAgreementV1Vars } from '../schemas/ndis-service-agreement-v1'

// Register Helvetica (built-in font, no external loading needed)
// Note: @react-pdf/renderer has issues with Google Fonts
// Using built-in fonts is more reliable for Vercel deployment

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2 solid #4f46e5'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 3
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #e5e7eb'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5
  },
  label: {
    width: '40%',
    fontSize: 9,
    color: '#6b7280',
    fontWeight: 500
  },
  value: {
    width: '60%',
    fontSize: 10,
    color: '#1f2937'
  },
  table: {
    marginTop: 10,
    marginBottom: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottom: '2 solid #d1d5db',
    fontWeight: 600
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb'
  },
  tableCol: {
    fontSize: 9
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  signatureBox: {
    width: '45%',
    borderTop: '1 solid #9ca3af',
    paddingTop: 5
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6b7280'
  }
})

interface ContractTemplateProps {
  vars: NdisServiceAgreementV1Vars
}

export function NdisServiceAgreementTemplate({ vars }: ContractTemplateProps) {
  const { provider, participant, property, agreement, totals, generatedAt } = vars

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Document>
      {/* PAGE 1: Contract Details & Parties */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>NDIS Service Agreement</Text>
          <Text style={styles.subtitle}>Contract ID: {agreement.contractId}</Text>
          <Text style={styles.subtitle}>Generated: {formatDate(generatedAt)}</Text>
        </View>

        {/* Provider Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Provider</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Organization:</Text>
            <Text style={styles.value}>{provider.name}</Text>
          </View>
          {provider.abn && (
            <View style={styles.row}>
              <Text style={styles.label}>ABN:</Text>
              <Text style={styles.value}>{provider.abn}</Text>
            </View>
          )}
          {provider.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{provider.email}</Text>
            </View>
          )}
          {provider.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{provider.phone}</Text>
            </View>
          )}
          {provider.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <View style={styles.value}>
                {provider.address.line1 && <Text>{provider.address.line1}</Text>}
                {provider.address.line2 && <Text>{provider.address.line2}</Text>}
                {provider.address.suburb && (
                  <Text>
                    {provider.address.suburb}, {provider.address.state} {provider.address.postcode}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Participant Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NDIS Participant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{participant.fullName}</Text>
          </View>
          {participant.dateOfBirth && (
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{formatDate(participant.dateOfBirth)}</Text>
            </View>
          )}
          {participant.ndisId && (
            <View style={styles.row}>
              <Text style={styles.label}>NDIS Number:</Text>
              <Text style={styles.value}>{participant.ndisId}</Text>
            </View>
          )}
          {participant.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{participant.phone}</Text>
            </View>
          )}
          {participant.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{participant.email}</Text>
            </View>
          )}
        </View>

        {/* Property Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Location</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Property:</Text>
            <Text style={styles.value}>{property.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{property.address}</Text>
          </View>
        </View>

        {/* Agreement Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Contract Type:</Text>
            <Text style={styles.value}>{agreement.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Start Date:</Text>
            <Text style={styles.value}>{formatDate(agreement.startDate)}</Text>
          </View>
          {agreement.endDate && (
            <View style={styles.row}>
              <Text style={styles.label}>End Date:</Text>
              <Text style={styles.value}>{formatDate(agreement.endDate)}</Text>
            </View>
          )}
          {agreement.durationDays && (
            <View style={styles.row}>
              <Text style={styles.label}>Duration:</Text>
              <Text style={styles.value}>{agreement.durationDays} days</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Total Funding:</Text>
            <Text style={styles.value}>{formatCurrency(agreement.totalAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Current Balance:</Text>
            <Text style={styles.value}>{formatCurrency(agreement.currentBalance)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Page 1 of 3 • {provider.name} • Generated {formatDate(generatedAt)}
        </Text>
      </Page>

      {/* PAGE 2: Service Details & Payment Terms */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Service Details & Payment Terms</Text>
          <Text style={styles.subtitle}>Contract ID: {agreement.contractId}</Text>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Delivery</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Daily Support Rate:</Text>
            <Text style={styles.value}>{formatCurrency(agreement.dailyRate)}</Text>
          </View>
          {agreement.frequency && (
            <View style={styles.row}>
              <Text style={styles.label}>Billing Frequency:</Text>
              <Text style={styles.value}>{agreement.frequency}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Service Location:</Text>
            <Text style={styles.value}>{property.name}</Text>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          <Text style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.6 }}>
            This agreement establishes the terms under which {provider.name} will provide support services 
            to {participant.fullName} under the National Disability Insurance Scheme (NDIS).
          </Text>
          <Text style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.6 }}>
            Services will be provided at {property.name}, commencing on {formatDate(agreement.startDate)}
            {agreement.endDate && ` and concluding on ${formatDate(agreement.endDate)}`}.
          </Text>
          <Text style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.6 }}>
            The total funding amount for this agreement is {formatCurrency(agreement.totalAmount)}, 
            with a daily support rate of {formatCurrency(agreement.dailyRate)}.
          </Text>
          <Text style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.6 }}>
            All services provided will be in accordance with the participant's NDIS plan and will be 
            invoiced in accordance with NDIS pricing arrangements.
          </Text>
        </View>

        {/* Scope of Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of Services</Text>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>
            • Provision of support services as outlined in the participant's NDIS plan
          </Text>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>
            • Support coordination and service delivery at the agreed location
          </Text>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>
            • Regular reporting and documentation as required by NDIS guidelines
          </Text>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>
            • Compliance with all relevant NDIS practice standards and regulations
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Page 2 of 3 • {provider.name} • Generated {formatDate(generatedAt)}
        </Text>
      </Page>

      {/* PAGE 3: Financial Summary & Signatures */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Financial Summary</Text>
          <Text style={styles.subtitle}>Contract ID: {agreement.contractId}</Text>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funding Overview</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Description</Text>
              <Text style={[styles.tableCol, { width: '50%', textAlign: 'right' }]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Total Funding Allocated</Text>
              <Text style={[styles.tableCol, { width: '50%', textAlign: 'right' }]}>
                {formatCurrency(agreement.totalAmount)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Current Balance</Text>
              <Text style={[styles.tableCol, { width: '50%', textAlign: 'right', fontWeight: 600 }]}>
                {formatCurrency(agreement.currentBalance)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Funds Utilized</Text>
              <Text style={[styles.tableCol, { width: '50%', textAlign: 'right' }]}>
                {formatCurrency(agreement.totalAmount - agreement.currentBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Period</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>Transactions</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Last 7 Days</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>{totals.txns7d}</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>
                {formatCurrency(totals.amount7d)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Last 30 Days</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>{totals.txns30d}</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>
                {formatCurrency(totals.amount30d)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '50%' }]}>Last 12 Months</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>{totals.txns12m}</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}>
                {formatCurrency(totals.amount12m)}
              </Text>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Service Provider</Text>
            <Text style={{ fontSize: 9, marginTop: 30 }}>_________________________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 5 }]}>Signature</Text>
            <Text style={[styles.signatureLabel, { marginTop: 10 }]}>Date: _______________</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Participant / Representative</Text>
            <Text style={{ fontSize: 9, marginTop: 30 }}>_________________________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 5 }]}>Signature</Text>
            <Text style={[styles.signatureLabel, { marginTop: 10 }]}>Date: _______________</Text>
          </View>
        </View>

        {/* Important Notice */}
        <View style={{ marginTop: 30, padding: 10, backgroundColor: '#eff6ff', borderLeft: '3 solid #3b82f6' }}>
          <Text style={{ fontSize: 9, fontWeight: 600, marginBottom: 5 }}>Important Notice</Text>
          <Text style={{ fontSize: 8, lineHeight: 1.5 }}>
            This agreement is subject to the terms and conditions of the NDIS Practice Standards and 
            the NDIS Code of Conduct. Both parties agree to comply with all relevant legislation and 
            NDIS guidelines.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Page 3 of 3 • {provider.name} • Generated {formatDate(generatedAt)}
        </Text>
      </Page>
    </Document>
  )
}

