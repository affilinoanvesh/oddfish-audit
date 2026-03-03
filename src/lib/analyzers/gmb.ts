import { Finding, GMBData } from '../types';
import { dataforseoPost, extractDomain } from '../dataforseo';

interface MapsSearchResponse {
  tasks?: [{
    result?: [{
      items?: MapsItem[];
    }];
  }];
}

interface MapsItem {
  type?: string;
  title?: string;
  domain?: string;
  url?: string;
  rating?: {
    value?: number;
    votes_count?: number;
  };
  rating_distribution?: Record<string, number>;
  category?: string;
  additional_categories?: string[];
  address?: string;
  address_info?: {
    city?: string;
    zip?: string;
    region?: string;
    address?: string;
  };
  phone?: string;
  cid?: string;
  place_id?: string;
  is_claimed?: boolean;
  work_hours?: {
    timetable?: Record<string, unknown>;
    current_status?: string;
  };
  description?: string;
  total_photos?: number;
  main_image?: string;
}

interface BusinessInfoResponse {
  tasks?: [{
    result?: [{
      items?: BusinessInfoItem[];
    }];
  }];
}

interface BusinessInfoItem {
  title?: string;
  description?: string;
  category?: string;
  additional_categories?: string[];
  address?: string;
  address_info?: {
    city?: string;
    zip?: string;
    region?: string;
    address?: string;
  };
  phone?: string;
  url?: string;
  domain?: string;
  rating?: {
    value?: number;
    votes_count?: number;
  };
  rating_distribution?: Record<string, number>;
  is_claimed?: boolean;
  place_id?: string;
  cid?: string;
  work_hours?: {
    timetable?: Record<string, unknown>;
    current_status?: string;
  };
  total_photos?: number;
  attributes?: {
    service_options?: string[];
    accessibility?: string[];
    highlights?: string[];
    offerings?: string[];
    [key: string]: string[] | undefined;
  };
  people_also_search?: unknown[];
  local_business_links?: unknown[];
}

export async function analyzeGMB(
  url: string,
  businessName?: string,
  businessLocation?: string
): Promise<{ findings: Finding[]; gmbData?: GMBData }> {
  const domain = extractDomain(url);
  const findings: Finding[] = [];

  // Step 1: Find the listing via Maps search
  const keyword = businessName || domain;

  // businessLocation is a DataForSEO location_code (from the city dropdown)
  // Australia only — default to AU country-level (2036)
  const locationCode = businessLocation ? parseInt(businessLocation, 10) : 2036;

  const mapsBody: Record<string, unknown> = {
    keyword,
    language_code: 'en',
    depth: 5,
    location_code: locationCode,
  };

  const mapsData = await dataforseoPost<MapsSearchResponse>(
    '/serp/google/maps/live/advanced',
    mapsBody
  );

  const mapsResult = mapsData?.tasks?.[0]?.result?.[0];
  const items = mapsResult?.items ?? [];

  // Try to match listing by domain
  let listing = items.find(item =>
    item.domain && (
      item.domain === domain ||
      item.domain === `www.${domain}` ||
      item.domain.endsWith(`.${domain}`)
    )
  );

  // If no domain match, try title match when businessName was provided
  if (!listing && businessName && items.length > 0) {
    const nameLower = businessName.toLowerCase();
    listing = items.find(item =>
      item.title && item.title.toLowerCase().includes(nameLower)
    );
  }

  // Fallback: first result if title contains domain base
  if (!listing && items.length > 0) {
    const domainBase = domain.split('.')[0].toLowerCase();
    const first = items[0];
    if (first.title && first.title.toLowerCase().includes(domainBase)) {
      listing = first;
    }
  }

  if (!mapsData || !listing) {
    findings.push({
      title: 'GBP Listing Found',
      status: 'fail',
      description: 'No Google Business Profile found. A GBP listing is essential for local SEO visibility and building trust with potential customers.',
    });
    return { findings };
  }

  // Step 2: Try to get full business info if we have a place_id or cid
  let fullInfo: BusinessInfoItem | null = null;
  if (listing.place_id || listing.cid) {
    const infoBody: Record<string, unknown> = {
      language_code: 'en',
    };
    if (listing.place_id) {
      infoBody.place_id = listing.place_id;
    } else if (listing.cid) {
      infoBody.cid = listing.cid;
    }
    infoBody.location_code = locationCode;

    const infoData = await dataforseoPost<BusinessInfoResponse>(
      '/business_data/google/my_business_info/live',
      infoBody
    );
    fullInfo = infoData?.tasks?.[0]?.result?.[0]?.items?.[0] ?? null;
  }

  // Merge full info with maps listing (full info takes priority)
  const biz = {
    title: fullInfo?.title ?? listing.title ?? '',
    description: fullInfo?.description ?? listing.description ?? '',
    category: fullInfo?.category ?? listing.category ?? '',
    additionalCategories: fullInfo?.additional_categories ?? listing.additional_categories ?? [],
    address: fullInfo?.address ?? listing.address ?? '',
    addressInfo: fullInfo?.address_info ?? listing.address_info,
    phone: fullInfo?.phone ?? listing.phone,
    domain: fullInfo?.domain ?? listing.domain,
    url: fullInfo?.url ?? listing.url,
    rating: fullInfo?.rating?.value ?? listing.rating?.value ?? 0,
    reviewCount: fullInfo?.rating?.votes_count ?? listing.rating?.votes_count ?? 0,
    ratingDistribution: fullInfo?.rating_distribution ?? listing.rating_distribution,
    isClaimed: fullInfo?.is_claimed ?? listing.is_claimed,
    placeId: fullInfo?.place_id ?? listing.place_id,
    workHours: fullInfo?.work_hours ?? listing.work_hours,
    totalPhotos: fullInfo?.total_photos ?? listing.total_photos ?? 0,
    attributes: fullInfo?.attributes,
  };

  // Finding 1: GBP Listing Found
  findings.push({
    title: 'GBP Listing Found',
    status: 'pass',
    description: `Google Business Profile found: "${biz.title}"`,
    detail: [
      biz.category ? `Category: ${biz.category}` : null,
      biz.address ? `Address: ${biz.address}` : null,
    ].filter(Boolean).join(' | '),
  });

  // Finding 2: Claimed & Verified — unclaimed is a serious issue
  if (biz.isClaimed === false) {
    findings.push({
      title: 'Claimed & Verified',
      status: 'fail',
      description: 'Your Google Business Profile is NOT claimed. Anyone can suggest edits to unclaimed listings. Claim it immediately to control your business information, respond to reviews, and post updates.',
    });
  } else {
    findings.push({
      title: 'Claimed & Verified',
      status: 'pass',
      description: 'Your Google Business Profile is claimed and verified.',
    });
  }

  // Finding 3: Business Rating — strict thresholds (4.5+ to pass)
  if (biz.rating === 0) {
    findings.push({
      title: 'Business Rating',
      status: 'fail',
      description: 'No rating on your Google Business Profile. Without a rating, your listing looks unestablished and loses clicks to rated competitors.',
    });
  } else if (biz.rating < 3.5) {
    findings.push({
      title: 'Business Rating',
      status: 'fail',
      description: `Your Google rating is ${biz.rating.toFixed(1)}/5. Ratings below 3.5 actively deter customers — 87% of consumers won't consider a business rated below 3 stars.`,
    });
  } else if (biz.rating < 4.5) {
    findings.push({
      title: 'Business Rating',
      status: 'warn',
      description: `Your Google rating is ${biz.rating.toFixed(1)}/5. Top-performing local businesses maintain 4.5+ ratings. Every 0.1 star improvement can increase click-through rates by 25%.`,
    });
  } else {
    findings.push({
      title: 'Business Rating',
      status: 'pass',
      description: `Your Google rating is ${biz.rating.toFixed(1)}/5 — excellent social proof for searchers.`,
    });
  }

  // Finding 4: Review Volume — 50+ to pass, most businesses won't hit this
  if (biz.reviewCount < 10) {
    findings.push({
      title: 'Review Volume',
      status: 'fail',
      description: `Only ${biz.reviewCount} Google reviews. Businesses with fewer than 10 reviews are often overlooked. Google favors listings with strong review volume in local pack rankings.`,
    });
  } else if (biz.reviewCount < 50) {
    findings.push({
      title: 'Review Volume',
      status: 'warn',
      description: `${biz.reviewCount} Google reviews. The average local business ranking in the top 3 has 50+ reviews. A consistent review generation strategy is critical.`,
    });
  } else {
    findings.push({
      title: 'Review Volume',
      status: 'pass',
      description: `${biz.reviewCount} Google reviews — strong review presence for local SEO.`,
    });
  }

  // Finding 5: Rating Distribution — check both 1-star and sub-4-star concentration
  if (biz.ratingDistribution) {
    const totalRatings = Object.values(biz.ratingDistribution).reduce((sum, v) => sum + (v || 0), 0);
    const oneStarCount = biz.ratingDistribution['1'] || 0;
    const twoStarCount = biz.ratingDistribution['2'] || 0;
    const threeStarCount = biz.ratingDistribution['3'] || 0;
    if (totalRatings > 0) {
      const negativeCount = oneStarCount + twoStarCount;
      const negativePct = (negativeCount / totalRatings) * 100;
      const subFourPct = ((negativeCount + threeStarCount) / totalRatings) * 100;
      const detail = Object.entries(biz.ratingDistribution).map(([star, count]) => `${star}-star: ${count}`).join(' | ');
      if (negativePct > 15) {
        findings.push({
          title: 'Rating Distribution',
          status: 'fail',
          description: `${Math.round(negativePct)}% of reviews are 1-2 stars. Negative reviews are prominently displayed and heavily influence purchase decisions. A reputation management strategy is urgently needed.`,
          detail,
        });
      } else if (subFourPct > 25) {
        findings.push({
          title: 'Rating Distribution',
          status: 'warn',
          description: `${Math.round(subFourPct)}% of reviews are below 4 stars. Even 3-star reviews signal mediocrity to potential customers browsing local results.`,
          detail,
        });
      } else {
        findings.push({
          title: 'Rating Distribution',
          status: 'pass',
          description: 'Your rating distribution looks healthy with no major concentration of negative reviews.',
          detail,
        });
      }
    }
  }

  // Finding 6: Business Category
  if (!biz.category) {
    findings.push({
      title: 'Business Category',
      status: 'fail',
      description: 'No primary business category set. Setting a category helps Google understand your business and show it in relevant searches.',
    });
  } else {
    findings.push({
      title: 'Business Category',
      status: 'pass',
      description: `Primary category set: "${biz.category}"`,
    });
  }

  // Finding 7: Additional Categories — need 3+ to pass
  if (biz.additionalCategories.length === 0) {
    findings.push({
      title: 'Additional Categories',
      status: 'fail',
      description: 'No additional categories set. You\'re missing out on appearing in related search categories. Businesses with multiple categories get up to 5x more discovery impressions.',
    });
  } else if (biz.additionalCategories.length < 3) {
    findings.push({
      title: 'Additional Categories',
      status: 'warn',
      description: `Only ${biz.additionalCategories.length} additional categories. Add at least 3 relevant categories to maximize discoverability across related searches.`,
      detail: biz.additionalCategories.join(', '),
    });
  } else {
    findings.push({
      title: 'Additional Categories',
      status: 'pass',
      description: `${biz.additionalCategories.length} additional categories set for broader discoverability.`,
      detail: biz.additionalCategories.join(', '),
    });
  }

  // Finding 8: Business Description — 250+ chars to pass (GBP allows 750)
  // Note: DataForSEO often does not return the description field even when one exists on the GMB profile.
  // We only assert fail/pass when we actually have the data; otherwise give a recommendation.
  if (biz.description && biz.description.length >= 250) {
    findings.push({
      title: 'Business Description',
      status: 'pass',
      description: `Business description is ${biz.description.length} characters — thorough and informative.`,
    });
  } else if (biz.description && biz.description.length > 0) {
    findings.push({
      title: 'Business Description',
      status: 'warn',
      description: `Business description is only ${biz.description.length} characters. Google allows 750 characters — you\'re using less than a third. A longer, keyword-rich description improves local rankings.`,
    });
  } else {
    // API didn't return description — it may still exist on the profile, so use a softer check
    findings.push({
      title: 'Business Description',
      status: 'warn',
      description: 'Ensure your GBP description is set and uses all 750 characters. A keyword-rich description covering your services, service areas, and unique value proposition improves local rankings.',
    });
  }

  // Finding 9: Business Phone (NAP)
  if (!biz.phone) {
    findings.push({
      title: 'Business Phone (NAP)',
      status: 'fail',
      description: 'No phone number listed. A phone number is critical for NAP consistency and customer contact.',
    });
  } else {
    findings.push({
      title: 'Business Phone (NAP)',
      status: 'pass',
      description: `Phone number listed: ${biz.phone}`,
    });
  }

  // Finding 10: Business Address (NAP) — incomplete = fail
  if (!biz.address) {
    findings.push({
      title: 'Business Address (NAP)',
      status: 'fail',
      description: 'No business address listed. A complete address is essential for local SEO, map pack rankings, and NAP consistency across the web.',
    });
  } else {
    const hasFullAddress = biz.addressInfo &&
      biz.addressInfo.city && biz.addressInfo.zip;
    if (!hasFullAddress) {
      findings.push({
        title: 'Business Address (NAP)',
        status: 'fail',
        description: 'Address is incomplete — missing city or zip code. Incomplete NAP data causes inconsistencies across directories, which directly hurts local rankings.',
        detail: biz.address,
      });
    } else {
      findings.push({
        title: 'Business Address (NAP)',
        status: 'pass',
        description: 'Full business address with city and zip code is listed.',
        detail: biz.address,
      });
    }
  }

  // Finding 11: Website Link — mismatch is a fail, not warn
  if (!biz.domain && !biz.url) {
    findings.push({
      title: 'Website Link',
      status: 'fail',
      description: 'No website URL linked to your Google Business Profile. You\'re losing direct traffic from every person who views your listing.',
    });
  } else {
    const bizDomain = biz.domain?.replace(/^www\./, '') ?? '';
    if (bizDomain && bizDomain !== domain && !bizDomain.endsWith(`.${domain}`) && !domain.endsWith(`.${bizDomain}`)) {
      findings.push({
        title: 'Website Link',
        status: 'fail',
        description: `GBP website (${bizDomain}) doesn't match your domain (${domain}). This confuses Google and splits your authority between domains. Fix this immediately.`,
      });
    } else {
      findings.push({
        title: 'Website Link',
        status: 'pass',
        description: 'Website URL on your GBP matches your domain.',
      });
    }
  }

  // Finding 12: Business Hours — both Maps and Business Info APIs return this, so missing = genuinely not set
  if (!biz.workHours?.timetable || Object.keys(biz.workHours.timetable).length === 0) {
    findings.push({
      title: 'Business Hours',
      status: 'fail',
      description: 'No business hours set on your GBP. Listings without hours get fewer calls and direction requests. Google shows "Hours not available" which deters clicks.',
    });
  } else {
    const daysSet = Object.keys(biz.workHours.timetable).length;
    if (daysSet < 7) {
      findings.push({
        title: 'Business Hours',
        status: 'warn',
        description: `Business hours only set for ${daysSet} of 7 days. Set hours for every day (even if closed) so customers always know your availability.`,
      });
    } else {
      findings.push({
        title: 'Business Hours',
        status: 'pass',
        description: `Business hours set for all 7 days.${biz.workHours.current_status ? ` Currently: ${biz.workHours.current_status}` : ''}`,
      });
    }
  }

  // Finding 13: Photos — 25+ to pass (Google data shows strong correlation)
  if (biz.totalPhotos < 5) {
    findings.push({
      title: 'Photos',
      status: 'fail',
      description: `Only ${biz.totalPhotos} photos on your GBP. Businesses with 100+ photos get 520% more calls and 2,717% more direction requests than average. You need significantly more visual content.`,
    });
  } else if (biz.totalPhotos < 25) {
    findings.push({
      title: 'Photos',
      status: 'warn',
      description: `${biz.totalPhotos} photos on your GBP. Top-ranking local businesses average 25+ photos including interior, exterior, products, team, and behind-the-scenes shots.`,
    });
  } else {
    findings.push({
      title: 'Photos',
      status: 'pass',
      description: `${biz.totalPhotos} photos on your GBP — great visual presence.`,
    });
  }

  // Finding 14: Business Attributes — missing = fail, few = warn, 5+ = pass
  if (biz.attributes) {
    const filledAttributes = Object.entries(biz.attributes).filter(
      ([, values]) => values && values.length > 0
    );
    if (filledAttributes.length === 0) {
      findings.push({
        title: 'Business Attributes',
        status: 'fail',
        description: 'No service attributes filled out. Google uses attributes to match businesses with specific customer searches (e.g., "wheelchair accessible restaurant near me"). You\'re invisible to these queries.',
      });
    } else if (filledAttributes.length < 5) {
      findings.push({
        title: 'Business Attributes',
        status: 'warn',
        description: `Only ${filledAttributes.length} attribute categories filled out. Fill out every applicable attribute — service options, accessibility, amenities, and highlights — to match more search queries.`,
        detail: filledAttributes.map(([k]) => k.replace(/_/g, ' ')).join(', '),
      });
    } else {
      findings.push({
        title: 'Business Attributes',
        status: 'pass',
        description: `${filledAttributes.length} attribute categories filled out (e.g., ${filledAttributes.slice(0, 3).map(([k]) => k.replace(/_/g, ' ')).join(', ')}).`,
      });
    }
  } else {
    // API didn't return attributes — they may still exist on the profile
    findings.push({
      title: 'Business Attributes',
      status: 'warn',
      description: 'Ensure your GBP attributes are fully filled out. Attributes like service options, accessibility, amenities, and highlights help Google match you with specific customer searches (e.g., "wheelchair accessible restaurant near me").',
    });
  }

  // Finding 15: Google Posts Activity — we can't reliably detect posts via this API, so give a recommendation
  findings.push({
    title: 'Google Posts Activity',
    status: 'warn',
    description: 'Ensure you are posting to your GBP weekly. Businesses that post regularly see 5x more profile views. Post updates, offers, events, and product highlights to keep your listing active and rank higher in the local pack.',
  });

  // Build GMBData for the overview card
  const gmbData: GMBData = {
    businessName: biz.title,
    rating: biz.rating,
    reviewCount: biz.reviewCount,
    address: biz.address,
    phone: biz.phone,
    category: biz.category,
    totalPhotos: biz.totalPhotos,
    isClaimed: biz.isClaimed ?? false,
    placeId: biz.placeId,
  };

  return { findings, gmbData };
}
