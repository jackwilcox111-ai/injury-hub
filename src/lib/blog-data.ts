export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: 'patients' | 'providers' | 'attorneys' | 'marketers' | 'general';
  readTime: string;
  publishedAt: string;
  author: string;
  content: string;
}

export const BLOG_CATEGORIES = [
  { value: 'all', label: 'All Resources' },
  { value: 'patients', label: 'For Patients' },
  { value: 'providers', label: 'For Providers' },
  { value: 'attorneys', label: 'For Attorneys' },
  { value: 'marketers', label: 'For Marketers' },
  { value: 'general', label: 'Industry Insights' },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  patients: 'bg-primary/10 text-primary',
  providers: 'bg-settled/10 text-settled',
  attorneys: 'bg-warning/10 text-warning',
  marketers: 'bg-destructive/10 text-destructive',
  general: 'bg-muted text-muted-foreground',
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'what-is-medical-lien-treatment',
    title: 'What Is Medical Lien Treatment? A Patient\'s Guide to Zero-Upfront-Cost Care',
    excerpt: 'After a personal injury accident, medical bills can pile up fast. Medical lien treatment lets you get the care you need now and pay later — only when your case settles.',
    category: 'patients',
    readTime: '5 min read',
    publishedAt: '2026-03-15',
    author: 'Got Hurt Team',
    content: `## What Is a Medical Lien?

A medical lien is a legal agreement between you, your medical provider, and your attorney. The provider agrees to treat you now and defer payment until your personal injury case settles. This means **zero out-of-pocket cost** while you recover.

## How Does It Work?

1. **You're injured in an accident** — car crash, slip and fall, or workplace incident
2. **You connect with the Got Hurt network** — we match you with providers who accept lien-based treatment
3. **You receive treatment immediately** — no insurance hassles, no upfront payments
4. **Your case settles** — the provider is paid from the settlement proceeds

## Why Choose Lien-Based Treatment?

- **No upfront costs** — Focus on healing, not bills
- **Access to specialists** — Orthopedics, chiropractic, pain management, imaging, and more
- **Documented care** — Every visit builds your case value
- **Coordinated with your attorney** — Your legal team stays informed throughout

## What Types of Treatment Are Covered?

Most personal injury-related treatments can be provided on a lien basis, including:
- Chiropractic care
- Physical therapy
- Orthopedic consultations
- MRI and diagnostic imaging
- Pain management
- Surgery (when necessary)

## Get Started Today

If you've been injured and need medical care, the Got Hurt Injury Network can connect you with providers in your area who accept lien-based treatment. Call us at **800-729-1570** or submit your information online.`,
  },
  {
    slug: 'choosing-right-personal-injury-doctor',
    title: 'How to Choose the Right Personal Injury Doctor After an Accident',
    excerpt: 'Not all doctors understand personal injury cases. Learn what to look for in a PI doctor and why choosing the right provider matters for your health and your settlement.',
    category: 'patients',
    readTime: '4 min read',
    publishedAt: '2026-03-10',
    author: 'Got Hurt Team',
    content: `## Why Your Choice of Doctor Matters

After an accident, the doctor you choose affects two things: your recovery and your case value. A doctor experienced in personal injury understands how to document injuries properly, which directly impacts your settlement.

## What to Look For

### 1. PI Experience
Choose a provider who regularly treats personal injury patients and understands lien-based billing.

### 2. Proper Documentation
Your doctor should document everything — symptoms, treatment plans, progress notes, and prognosis. This documentation becomes evidence in your case.

### 3. Willingness to Work on Lien
Not every doctor accepts lien-based treatment. The Got Hurt network pre-qualifies providers who do.

### 4. Multi-Specialty Access
Serious injuries often require multiple specialists. Look for a network that can coordinate across orthopedics, imaging, physical therapy, and pain management.

## Common Mistakes to Avoid

- **Waiting too long** to seek treatment (insurance companies use gaps against you)
- **Using your primary care doctor** who may not document for litigation
- **Skipping follow-up appointments** which weakens your case

## Let Us Help

The Got Hurt Injury Network connects you with vetted providers who specialize in personal injury care. Every provider in our network is credentialed, experienced, and ready to treat you on a lien basis.`,
  },
  {
    slug: 'grow-practice-pi-lien-cases',
    title: 'How Medical Providers Can Grow Their Practice with Personal Injury Lien Cases',
    excerpt: 'Personal injury lien cases offer providers a reliable revenue stream with higher reimbursement rates. Here\'s how to get started and what to expect.',
    category: 'providers',
    readTime: '6 min read',
    publishedAt: '2026-03-08',
    author: 'Got Hurt Team',
    content: `## Why PI Lien Cases Are Valuable for Providers

Personal injury lien cases typically reimburse at **full billed charges** rather than reduced insurance rates. For many practices, PI cases represent a significant revenue opportunity.

## Benefits of Joining a PI Network

- **Steady patient referrals** from attorneys and case managers
- **Higher reimbursement rates** compared to insurance
- **No insurance pre-authorizations** or denials to manage
- **Streamlined billing** through a centralized platform

## What You Need to Get Started

### Credentialing
Ensure your practice has proper licensing and malpractice insurance. The Got Hurt network handles credentialing verification.

### HIPAA Compliance
All providers must maintain HIPAA-compliant practices. Our platform includes built-in PHI safeguards.

### Documentation Standards
PI cases require thorough documentation. Every visit, every finding, every recommendation should be recorded in detail.

## How the Got Hurt Network Supports Providers

- **RCM billing management** — we track charges, codes, and payment status
- **Patient scheduling coordination** — referrals come with case context
- **Lien tracking dashboard** — see outstanding liens and payment timelines
- **Direct attorney communication** — collaborate on case needs seamlessly

## Join Our Network

Providers across Florida are already benefiting from the Got Hurt Injury Network. Apply today and start receiving qualified patient referrals.`,
  },
  {
    slug: 'provider-documentation-best-practices',
    title: 'Documentation Best Practices for Personal Injury Medical Providers',
    excerpt: 'Proper documentation can make or break a PI case. Learn the standards that maximize case value and protect your practice.',
    category: 'providers',
    readTime: '5 min read',
    publishedAt: '2026-02-28',
    author: 'Got Hurt Team',
    content: `## Why Documentation Matters in PI Cases

In personal injury, your medical records become legal evidence. Thorough, consistent documentation directly impacts the patient's settlement value — and your likelihood of being paid in full.

## Essential Documentation Elements

### Initial Evaluation
- Mechanism of injury (how the accident occurred)
- Chief complaints and symptoms
- Physical examination findings
- Diagnostic test results
- Treatment plan and prognosis

### Progress Notes
- Subjective complaints at each visit
- Objective findings and measurements
- Assessment of progress
- Plan adjustments

### Discharge Summary
- Final diagnosis
- Treatment summary
- Functional outcomes
- Future care recommendations
- Permanent impairment rating (if applicable)

## Common Documentation Pitfalls

1. **Copy-paste notes** — Every visit should reflect unique findings
2. **Missing causation language** — Connect symptoms to the accident
3. **Inconsistent visit frequency** — Gaps raise red flags
4. **Vague prognosis** — Be specific about expected outcomes

## The Impact on Settlement Value

Well-documented cases with clear causation, consistent treatment, and detailed prognosis consistently achieve higher settlement values. Your documentation is the foundation.`,
  },
  {
    slug: 'attorney-guide-medical-lien-networks',
    title: 'Attorney\'s Guide to Medical Lien Networks: Maximizing Case Value',
    excerpt: 'Learn how partnering with a medical lien network can streamline your PI practice, improve case outcomes, and increase settlement values.',
    category: 'attorneys',
    readTime: '7 min read',
    publishedAt: '2026-03-12',
    author: 'Got Hurt Team',
    content: `## Why Attorneys Need a Medical Lien Network

Managing medical treatment for PI clients is time-consuming. A medical lien network handles provider coordination, billing tracking, and records management — so you can focus on the legal strategy.

## Key Benefits for Law Firms

### 1. Faster Client Treatment
No waiting for insurance approvals. Clients start treatment immediately, which means stronger cases and happier clients.

### 2. Higher Case Values
Coordinated, well-documented treatment across multiple specialties builds comprehensive medical specials that maximize settlement demands.

### 3. Streamlined Records Collection
All medical records, billing statements, and lien amounts are centralized in one platform — no more chasing providers.

### 4. Colossus-Optimized Documentation
Our providers understand what insurance adjusters and Colossus scoring systems look for in medical documentation.

## How the Got Hurt Platform Works for Attorneys

- **Case dashboard** — Track all your cases in one place
- **Real-time updates** — Know when clients attend appointments
- **Demand letter support** — Medical specials and lien totals calculated automatically
- **Settlement worksheet** — See the full financial picture before negotiating
- **Marketplace access** — Discover pre-qualified cases that match your criteria

## Getting Started

Join the Got Hurt attorney network to start receiving coordinated case support. Our team handles the medical side so you can focus on winning.`,
  },
  {
    slug: 'understanding-colossus-scoring',
    title: 'Understanding Colossus Scoring: What Attorneys Need to Know',
    excerpt: 'Insurance companies use Colossus to evaluate claims. Understanding how it works helps attorneys build stronger demands and negotiate better settlements.',
    category: 'attorneys',
    readTime: '6 min read',
    publishedAt: '2026-02-20',
    author: 'Got Hurt Team',
    content: `## What Is Colossus?

Colossus is a claims evaluation software used by major insurance carriers to assess the value of personal injury claims. It analyzes medical treatment data to generate a settlement range.

## Key Factors Colossus Evaluates

### Medical Treatment
- **Treatment duration** — Longer, consistent treatment generally scores higher
- **Specialty count** — Cases involving multiple specialists indicate severity
- **Surgery** — Surgical intervention significantly impacts value
- **Imaging** — MRI findings, X-rays, and other diagnostics

### Injury Characteristics
- **Injury severity** — Classified from minor soft tissue to permanent impairment
- **Permanent impairment** — Rated injuries command higher values
- **Pre-existing conditions** — Can reduce or complicate scoring

### Financial Factors
- **Total medical specials** — The foundation of most demand calculations
- **Lost wages** — Documented wage loss adds to claim value
- **Policy limits** — Caps the maximum recovery

## How to Optimize for Colossus

1. **Ensure consistent treatment** — No gaps in care
2. **Use multiple specialties** — When medically appropriate
3. **Document everything** — Colossus relies on what's in the records
4. **Get impairment ratings** — When permanent impairment exists
5. **Track all specials** — Every charge matters

## How Got Hurt Helps

Our platform tracks Colossus-relevant factors automatically, giving attorneys a clear picture of estimated case value throughout the treatment lifecycle.`,
  },
  {
    slug: 'marketer-guide-pi-referrals',
    title: 'The Marketer\'s Guide to Personal Injury Referrals',
    excerpt: 'Learn how independent marketers can earn commissions by connecting injured individuals with the Got Hurt Injury Network — ethically and compliantly.',
    category: 'marketers',
    readTime: '5 min read',
    publishedAt: '2026-03-05',
    author: 'Got Hurt Team',
    content: `## What Is a PI Marketer?

Independent marketers help connect injured individuals with medical care and legal representation. When done ethically, this service fills a critical gap — many accident victims don't know where to turn for help.

## How the Got Hurt Marketer Program Works

### 1. Apply and Get Approved
Complete our application process. We verify your background and ensure compliance with applicable regulations.

### 2. Submit Cases
When you encounter someone who's been injured, submit their information through our secure portal. Consent verification is built into the process.

### 3. Track Progress
Monitor your submitted cases through your marketer dashboard. See real-time status updates as cases move through the pipeline.

### 4. Earn Commissions
When cases meet qualifying milestones, commissions are calculated and paid according to your fee structure.

## Compliance Is Non-Negotiable

- **Written consent** is required for every case submission
- **No solicitation** at accident scenes or hospitals
- **Transparent fee structures** — no hidden arrangements
- **Audit trail** — every interaction is logged

## Marketing Channels That Work

- Community outreach and education
- Digital advertising (compliant with bar association rules)
- Referral partnerships with auto body shops, towing companies
- Social media awareness campaigns

## Ready to Join?

Apply to become a Got Hurt marketer and start earning while helping injured individuals access the care they need.`,
  },
  {
    slug: 'florida-personal-injury-statute-limitations',
    title: 'Florida Personal Injury Statute of Limitations: What You Need to Know',
    excerpt: 'Missing the statute of limitations deadline means losing your right to recover damages. Here\'s what Florida law says and how to stay protected.',
    category: 'general',
    readTime: '4 min read',
    publishedAt: '2026-03-01',
    author: 'Got Hurt Team',
    content: `## Florida's Statute of Limitations for PI Cases

As of the 2023 tort reform (HB 837), Florida's statute of limitations for most personal injury cases is **two years** from the date of the accident. This is a significant change from the previous four-year window.

## Why This Matters

If you don't file a lawsuit within two years, you lose your right to recover damages — no matter how strong your case is. This applies to:
- Car accidents
- Slip and fall injuries
- Medical malpractice (with some exceptions)
- Product liability claims

## Key Considerations

### The Clock Starts Ticking Immediately
From the date of your accident, you have exactly two years. Don't wait to seek legal representation and medical treatment.

### Treatment Gaps Hurt Your Case
Insurance companies look for gaps in treatment. Starting care early and maintaining consistent appointments strengthens both your health and your legal position.

### Documentation Is Time-Sensitive
Evidence degrades over time. Witness memories fade, surveillance footage gets deleted, and medical symptoms evolve. Act quickly.

## How Got Hurt Helps

Our platform tracks statute of limitations dates for every case and sends automated alerts as deadlines approach. Care managers ensure patients stay on track with treatment schedules, and attorneys receive real-time updates on case milestones.

## Don't Wait

If you've been injured in Florida, contact the Got Hurt Injury Network today at **800-729-1570**. Time is not on your side.`,
  },
];
