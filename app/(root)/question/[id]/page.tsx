import Answer from "@/components/forms/Answer";
import AllAnswers from "@/components/shared/AllAnswers";
import ParseHTML from "@/components/shared/ParseHTML";
import RenderStat from "@/components/shared/RenderStat";
import RenderTag from "@/components/shared/RenderTag";
import Votes from "@/components/shared/Votes";
import { getQuestionById } from "@/lib/actions/question.action";
import { getUserById } from "@/lib/actions/user.action";
import { getTimeStamp } from "@/lib/utils";
import { URLProps } from "@/types";
import { auth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Question",
};

const QuestionDetail = async ({ params, searchParams }: URLProps) => {
  const { id } = params;
  const question = await getQuestionById({ questionId: id });
  const { userId: clerkId } = auth();

  let mongoUser;

  if (clerkId) {
    mongoUser = await getUserById({ userId: clerkId });
  }

  return (
    <>
      <div className="flex-start w-full flex-col">
        <div className="flex w-full flex-col-reverse justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
          <Link
            href={`/profile/${question.author.clerkId}`}
            className="flex items-center justify-start gap-1"
          >
            <Image
              src={question.author.picture}
              alt="profile user"
              className="rounded-full"
              width={22}
              height={22}
            />
            <p className="paragraph-semibold text-dark300_light700">
              {question.author.name}
            </p>
          </Link>
          <div className="flex justify-end">
            <Votes
              type="Question"
              itemId={JSON.stringify(question._id)}
              userId={JSON.stringify(mongoUser?._id)}
              upvotes={question.upvotes.length}
              hasupVoted={question.upvotes.includes(mongoUser?._id)}
              downvotes={question.downvotes.length}
              hasdownVoted={question.downvotes.includes(mongoUser?._id)}
              hasSaved={(mongoUser?.saved ?? []).includes(question._id)}
            />
          </div>
        </div>
        <h2 className="h2-semibold text-dark200_light900 mt-3.5 w-full text-left">
          {question.title}
        </h2>
      </div>

      <div className="mb-8 mt-5 flex flex-wrap gap-4">
        <RenderStat
          imgUrl="/assets/icons/clock.svg"
          count={getTimeStamp(question.createdAt)}
          type="time"
        />
        <RenderStat
          imgUrl="/assets/icons/message.svg"
          count={question.answers.length}
          type="Answer"
        />
        <RenderStat
          imgUrl="/assets/icons/eye.svg"
          count={question.views}
          type="View"
        />
      </div>

      <ParseHTML data={question.content} />

      <div className="mt-8 flex flex-wrap gap-2">
        {question.tags.map((tag: any, index: number) => (
          <RenderTag tag={tag.name} _id={tag._id} key={index} />
        ))}
      </div>

      <AllAnswers
        questionId={question._id}
        userId={JSON.stringify(mongoUser?._id)}
        totalAnswers={question.answers.length}
        filter={searchParams?.filter}
        page={searchParams.page ? +searchParams.page : 1}
      />

      <Answer
        // authorId is author of who answered, not author of who asked
        authorId={JSON.stringify(mongoUser?._id)}
        questionId={JSON.stringify(question._id)}
        questionContent={question.content}
      />
    </>
  );
};

export default QuestionDetail;
