import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FreelancerProfile, PortfolioItem } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, MapPin, Link as LinkIcon, DollarSign, Star, Briefcase, GraduationCap, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      try {
        // Fetch User details for name
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        }

        // Fetch profile
        const q = query(collection(db, 'freelancer_profiles'), where('userId', '==', id));
        const docSnap = await getDocs(q);
        
        if (!docSnap.empty) {
          setProfile(docSnap.docs[0].data() as FreelancerProfile);
        }
      } catch (error) {
        console.error("Error fetching public profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 p-12 text-center text-muted-foreground animate-pulse">Loading profile...</div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="text-center p-6">
              <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center text-3xl font-bold text-primary mb-4">
                {userName.charAt(0).toUpperCase() || 'F'}
              </div>
              <h1 className="text-2xl font-bold font-heading">{userName || 'Freelancer'}</h1>
              <p className="text-muted-foreground mt-1 mb-4">{profile.headline || 'Independent Professional'}</p>
              
              <div className="flex flex-col gap-2 text-sm text-muted-foreground border-t border-border pt-4">
                <div className="flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${profile.hourlyRate || 0} / hr</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Remote</span>
                </div>
              </div>
              
              <Button className="w-full mt-6">Invite to Job</Button>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.length > 0 ? profile.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">{skill}</Badge>
                  )) : (
                    <span className="text-sm text-muted-foreground">No skills listed.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {profile.bio || 'No description provided.'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.portfolio?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.portfolio.map((item, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-4 group hover:border-primary/50 transition-colors">
                        <h4 className="font-semibold group-hover:text-primary transition-colors">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{item.description}</p>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center mt-4 hover:underline">
                            <LinkIcon className="w-3 h-3 mr-1" /> View Project
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No portfolio items available.</p>
                )}
              </CardContent>
            </Card>

            {profile.experience?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5" />
                      <h4 className="font-semibold text-lg">{exp.role}</h4>
                      <p className="text-primary font-medium">{exp.company}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {exp.startDate} - {exp.endDate || 'Present'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-3">{exp.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {profile.education?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Education</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-4 bg-accent/30 rounded-lg">
                      <div>
                        <h4 className="font-semibold">{edu.degree}</h4>
                        <p className="text-sm text-muted-foreground">{edu.institution}</p>
                      </div>
                      <Badge variant="outline">{edu.year}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
