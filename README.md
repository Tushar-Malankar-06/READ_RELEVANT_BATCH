ReadRelevant.ai — Personalized AI Newsletter Pipeline
Overview

ReadRelevant.ai is a personalization platform that delivers role-specific newsletters by ingesting large volumes of unstructured content and transforming it into structured, high-quality data that can be reliably used by AI systems.

My role in this project focused on building the data pipeline and enforcing AI output quality, making sure that LLM-generated content was structured, validated, and usable downstream.

The Problem

Newsletters come from dozens of sources in different formats:

HTML emails

Blogs

Substack-style posts

PDFs and scraped web content

This content is:

Unstructured

Noisy and repetitive

Inconsistent across sources

Hard to personalize reliably

Simply running an LLM over raw text leads to:

Hallucinated fields

Inconsistent schemas

Duplicate or low-signal content

Poor personalization results

What I Built
1. Content Ingestion & ETL

Built an end-to-end ETL pipeline in Python to ingest 100+ newsletters per day from 30+ sources

Parsed raw content into clean text blocks for downstream processing

Automated ingestion to eliminate manual content handling

2. Schema Design & Storage

Designed a MongoDB schema to standardize newsletter content across sources

Created indexed collections optimized for:

Fast retrieval

Role-based personalization

Downstream AI workflows

Ensured schema flexibility while enforcing required fields

3. LLM-Based Structured Extraction

Used LLMs to convert unstructured newsletter text into structured JSON

Extracted fields such as:

Topic

Role relevance

Summary

Signal strength

Source metadata

4. AI Output Quality Validation (Critical Piece)

This was the most important part of my work.

I built validation and sanity checks to prevent bad AI output from propagating:

Schema validation (missing fields, invalid types)

Rule-based checks for hallucinated or low-signal content

Duplicate detection to reduce redundant articles

Confidence thresholds to flag weak summaries

This reduced duplicate and low-quality content by ~40% and made AI outputs safe to use in production pipelines.

5. Downstream Enablement

Enabled fast querying of personalized content by role

Created clean, consistent inputs for recommendation and ranking logic

Made the system reliable enough for non-technical stakeholders to trust

Tools & Stack

Python (ETL, validation, automation)

MongoDB (schema design, indexing)

LLMs for structured extraction and summarization

Git for version control
